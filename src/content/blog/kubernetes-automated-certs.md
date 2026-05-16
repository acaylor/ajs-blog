---
title: Automating wildcard TLS certificates in Kubernetes
date: 2026-05-16
description: 'Use cert-manager, Route 53 DNS-01 validation, and Reflector to renew and distribute wildcard TLS certificates across Kubernetes namespaces.'
author: aj
image: /images/k8s_logo.png
categories:
  - Homelab
  - Kubernetes
  - Networking
tags:
  - kubernetes
  - cert-manager
  - letsencrypt
  - AWS
  - certificate
  - homelab
---

In a [previous post][1], I used `acme.sh` to request a wildcard TLS certificate with DNS validation. That approach works, but it still leaves a manual follow-up step: copy the TLS secret into every Kubernetes namespace or other place that needs it.

This post walks through a more automated version: [cert-manager][2] requests and renews a wildcard certificate with the [Let's Encrypt][3] ACME API, [Amazon Route 53][4] handles the DNS-01 challenge, and [Reflector][5] optionally mirrors the generated TLS secret into the namespaces that consume it.

The end state is a wildcard certificate for a private subdomain like `*.home.example.com`, renewed automatically and stored as `Secret/tls-home`. With a wildcard cert I can give applications easy to remember DNS names and use HTTPS to encrypt traffic between the browser and the web server.

You do not need Argo CD to use the examples. I show my Argo CD layout because that is how I run the homelab, but the important Kubernetes objects are just a `Secret`, a `ClusterIssuer`, and a `Certificate`. You can apply those directly with `kubectl`.

## The shape of the solution

Two controllers cooperate:

- **cert-manager** issues and renews the certificate. It solves the ACME `dns-01` challenge by writing a TXT record into Route 53, then writes the certificate and private key into `Secret/tls-home` in the `cert-manager` namespace.
- **Reflector** is optional. It watches the source secret and mirrors it into consuming namespaces such as `argocd`, `apps`, and `monitoring`, keeping the copies in sync as cert-manager renews.

If you only need the cert in one namespace, skip Reflector and create the `Certificate` in the same namespace as the Ingress. If several namespaces need the same wildcard cert, create it once in `cert-manager` and mirror the generated secret.

```text
Let's Encrypt (ACME prod)
        |
        | DNS-01
        v
Route 53 hosted zone
        |
        v
cert-manager Certificate/wildcard-home
        |
        | writes cert-manager/tls-home
        v
Reflector mirrors the secret
        |
        +--> argocd/tls-home
        +--> apps/tls-home
        +--> monitoring/tls-home
```

## Why DNS-01 (not HTTP-01)

I use a k3s cluster that lives behind NAT on a private network. A name like `*.home.example.com` can be split-horizon: internally it resolves to private addresses, while externally it has no usable A record. HTTP-01 requires Let's Encrypt's validation servers to reach `http://<name>/.well-known/acme-challenge/...`, which they cannot do for a private service.

DNS-01 sidesteps the network path by proving control of the domain through a TXT record in the public Route 53 hosted zone. The TXT record exists briefly during validation and gets cleaned up after the challenge completes.

Since I want a wildcard cert, a single DNS-01 challenge can issue a wildcard. HTTP-01 cannot.

## prerequisites

Before starting, you need:

- A working Kubernetes cluster and a local `kubectl` context that can create cluster-wide resources.
- [Helm][14] if you want to use the install commands below.
- A domain or subdomain hosted in Route 53.
- An ingress controller if you want to use the resulting certificate with `Ingress` resources.

cert-manager talks to Route 53 with an IAM user in this example. You need to create an IAM policy to change and read TXT records in the one hosted zone you care about, and poll for change propagation. This version assumes you specify `hostedZoneID` in the solver configuration.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ChangeRecordSets",
      "Effect": "Allow",
      "Action": ["route53:ChangeResourceRecordSets", "route53:ListResourceRecordSets"],
      "Resource": "arn:aws:route53:::hostedzone/<hosted-zone-id>",
      "Condition": {
        "ForAllValues:StringEquals": {
          "route53:ChangeResourceRecordSetsRecordTypes": ["TXT"]
        }
      }
    },
    {
      "Sid": "GetChange",
      "Effect": "Allow",
      "Action": "route53:GetChange",
      "Resource": "arn:aws:route53:::change/*"
    }
  ]
}
```

If you omit `hostedZoneID`, add `route53:ListHostedZonesByName` with `Resource: "*"`, because cert-manager needs to discover the zone by name.

A note if you are migrating from `acme.sh`: that tool polls public DNS resolvers with `dig` to confirm the TXT record propagated, so it does not need `route53:GetChange`. cert-manager polls AWS instead and can hang without it. This is easy to miss when reusing an existing IAM user.

> Create an access key for the user and load it into the cluster as a one-shot bootstrap step. It is not in Git.

```bash
kubectl create namespace cert-manager
kubectl -n cert-manager create secret generic route53-credentials \
  --from-literal=access-key-id="<AKIA...>" \
  --from-literal=secret-access-key="<secret>"
```

Eventually this can move to [External Secrets Operator][6], [Sealed Secrets][7], or another secret-management flow. The important part is that the static AWS credential is not stored in Git.

For production workloads on AWS, prefer role-based authentication instead of a long-lived IAM user access key. On EKS, that usually means [EKS Pod Identity][12] or [IAM Roles for Service Accounts][13] mapped to the cert-manager service account. Static access keys are convenient for a homelab or cluster outside AWS, but temporary credentials remove the key-rotation chore and reduce the blast radius if a Kubernetes secret is exposed.

## Install cert-manager

For a cluster without Argo CD or Flux, install cert-manager directly with Helm. Check the cert-manager install page for the current version, then pin that version in your command.

```bash
helm install \
  cert-manager oci://quay.io/jetstack/charts/cert-manager \
  --version v1.20.2 \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true \
  --set 'extraArgs[0]=--dns01-recursive-nameservers-only' \
  --set 'extraArgs[1]=--dns01-recursive-nameservers=1.1.1.1:53,8.8.8.8:53'
```

The two `extraArgs` are useful for private or split-horizon DNS zones. cert-manager runs a self-check before asking Let's Encrypt to validate, looking up the challenge TXT record itself. If it queries an internal DNS resolver that rewrites the private zone, it may not see the public TXT record. Forcing the self-check through `1.1.1.1` and `8.8.8.8` matches what Let's Encrypt's validators see.

Wait until the controller, webhook, and cainjector are ready:

```bash
kubectl -n cert-manager rollout status deploy/cert-manager
kubectl -n cert-manager rollout status deploy/cert-manager-webhook
kubectl -n cert-manager rollout status deploy/cert-manager-cainjector
```

If you do use Argo CD, the same settings belong in the cert-manager chart values file:

```yaml
extraArgs:
  - --dns01-recursive-nameservers-only
  - --dns01-recursive-nameservers=1.1.1.1:53,8.8.8.8:53
```

## My cert-manager Argo app

```text
argo-apps/apps/cert-manager/
  app.yaml
  values.yaml
  templates/
    cluster-issuer-letsencrypt-staging.yaml
    cluster-issuer-letsencrypt-prod.yaml
    wildcard-home-certificate.yaml
```

The app is a standard [Argo CD multi-source application][8]: the upstream chart, values from the Git repository, and a `templates/` path with the issuers and wildcard `Certificate`.

### ClusterIssuers

Two issuers are configured: staging and prod. Staging (`https://acme-staging-v02.api.letsencrypt.org/directory`) issues untrusted certs with much higher limits, which is useful for shaking down a new install before using the production issuer.

The staging issuer is the same shape as the production issuer. Change `metadata.name`, `spec.acme.server`, and `spec.acme.privateKeySecretRef.name`.

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: acme-contact@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-account-key
    solvers:
      - dns01:
          route53:
            region: us-east-1
            hostedZoneID: <hosted-zone-id>
            accessKeyIDSecretRef:
              name: route53-credentials
              key: access-key-id
            secretAccessKeySecretRef:
              name: route53-credentials
              key: secret-access-key
```

The `email` field is for ACME account contact, not validation. Let's Encrypt sends expiration warnings and policy notices to it. Keep it valid; it is the safety net if renewal silently fails.

### The Certificate

This is the only piece that defines the actual cert.

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wildcard-home
  namespace: cert-manager
spec:
  secretName: tls-home
  secretTemplate:
    annotations:
      reflector.v1.k8s.emberstack.com/reflection-allowed: 'true'
      reflector.v1.k8s.emberstack.com/reflection-allowed-namespaces: 'argocd,apps,monitoring'
      reflector.v1.k8s.emberstack.com/reflection-auto-enabled: 'true'
      reflector.v1.k8s.emberstack.com/reflection-auto-namespaces: 'argocd,apps,monitoring'
      reflector.v1.k8s.emberstack.com/reflection-auto-overwrite-existing: 'true'
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - '*.home.example.com'
    - home.example.com
  duration: 2160h # 90d
  renewBefore: 720h # 30d
  privateKey:
    algorithm: ECDSA
    size: 256
    rotationPolicy: Always
```

A few choices worth calling out:

- `secretTemplate` puts the reflector annotations on the **generated** secret. cert-manager re-applies them every reconcile, so they cannot drift. Remove this block if you are not using Reflector.
- Including both the wildcard and apex in `dnsNames` means a single cert covers `home.example.com` and any single-label subdomain. Two-label subdomains such as `a.b.home.example.com` would need a separate cert.
- `rotationPolicy: Always` regenerates the private key on every renewal. Current cert-manager releases already default to this, but setting it explicitly makes the intent obvious.

> I recommend you first test using the staging Issuer to catch any errors. Issuance in the staging-then-prod order keeps the rate limit safe. The production Issuer will block your requests if you keep sending invalid data. Flip to staging in `issuerRef.name`, sync, watch the Order/Challenge resources reach `Ready=True`, then flip back.

Apply the issuer and certificate directly if you are not using GitOps:

```bash
kubectl apply -f cluster-issuer-letsencrypt-staging.yaml
kubectl apply -f cluster-issuer-letsencrypt-prod.yaml
kubectl apply -f wildcard-home-certificate.yaml
```

When the `Certificate` is ready, cert-manager has created `Secret/tls-home` in the same namespace as the `Certificate`. An Ingress can use it like this:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: example-app
  namespace: apps
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.home.example.com
      secretName: tls-home
  rules:
    - host: app.home.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: example-app
                port:
                  number: 80
```

The `secretName` must exist in the same namespace as the Ingress. In this example, either create the `Certificate` in `apps` or let Reflector copy `cert-manager/tls-home` into `apps/tls-home`.

## Optional: Reflector

```text
argo-apps/apps/reflector/
  app.yaml
  values.yaml
```

The chart itself does almost nothing interesting. It deploys a controller that watches secrets and configmaps for reflector annotations. The whole policy lives on the _source_ secret.

The annotations on `cert-manager/tls-home` are re-applied by cert-manager from `secretTemplate`.

| Annotation                                   | Effect                                                 |
| -------------------------------------------- | ------------------------------------------------------ |
| `reflection-allowed: "true"`                 | Opt this secret into reflection at all                 |
| `reflection-allowed-namespaces: ...`         | Comma list of namespaces _permitted_ to receive a copy |
| `reflection-auto-enabled: "true"`            | Reflector creates copies proactively                   |
| `reflection-auto-namespaces: ...`            | Where to auto-create copies                            |
| `reflection-auto-overwrite-existing: "true"` | Overwrite same-named secrets that pre-exist            |

Onboarding a new namespace is one Git change: append the namespace to both `*-allowed-namespaces` and `*-auto-namespaces`. Reflector picks it up and creates `<new-ns>/tls-home`.

Without Argo CD, install Reflector with Helm if you want this mirroring behavior:

```bash
helm repo add emberstack https://emberstack.github.io/helm-charts
helm repo update
helm install reflector emberstack/reflector \
  --namespace reflector \
  --create-namespace
```

## A note for Cilium ingress users

If your ingress controller is Cilium in shared-LB mode, or anything else that copies referenced TLS secrets into its own namespace and preserves source annotations, include that namespace in both Reflector lists too. Otherwise Reflector can see the controller's clones as orphan reflections and enter a delete loop while the controller re-copies the secret. Most other ingress controllers, including NGINX, Traefik, and HAProxy, read TLS secrets in place and do not have this problem.

## Bringing it up with kubectl

End-to-end first-time install without assuming Argo CD:

1. **Provision the IAM user and policy** in your AWS account (Terraform, console, whatever you prefer) and grab an access key.
2. **Install cert-manager** with Helm and wait for the deployments to roll out.
3. **Bootstrap the credential secret** by creating `route53-credentials` in the `cert-manager` namespace.
4. **Apply the staging `ClusterIssuer` and `Certificate`.** Set `issuerRef.name: letsencrypt-staging`, then wait for `Certificate/wildcard-home` to reach `Ready=True`.
5. **Switch to production** by changing `issuerRef.name` to `letsencrypt-prod`, applying the file again, and waiting for a trusted certificate.
6. **Install Reflector if needed.** Skip this if the certificate lives in the same namespace as the Ingress that uses it.
7. **Update Ingresses** to reference `secretName: tls-home` in their own namespace.
8. **Delete any legacy manually copied secrets** after you confirm cert-manager and Reflector are managing the new ones.

In my Argo CD setup, steps 2, 4, 5, and 6 become Git commits plus Argo syncs. The chart still has the same ordering: CRDs, controller/webhook/cainjector, ClusterIssuers, then Certificate.

## Verification

```bash
# cert-manager issued the cert
kubectl -n cert-manager get certificate wildcard-home
kubectl -n cert-manager get secret tls-home -o jsonpath='{.data.tls\.crt}' \
  | base64 -d | openssl x509 -noout -issuer -subject -dates

# reflector reflected it everywhere expected
for ns in argocd apps monitoring; do
  echo "=== $ns ==="
  kubectl -n $ns get secret tls-home \
    -o jsonpath='{.metadata.annotations.reflector\.v1\.k8s\.emberstack\.com/reflects}{"\n"}' 2>/dev/null
done

# reflector is healthy (no churn on idle reconciles)
kubectl -n reflector logs -l app.kubernetes.io/name=reflector --tail=20
```

A healthy steady state shows `Certificate/wildcard-home` as `Ready=True`, the same `tls-home` secret mirrored into every consuming namespace with a `reflects: cert-manager/tls-home` annotation, and Reflector logs reporting no changes on idle reconciles.

## What this replaces

The renewal that used to be a quarterly calendar reminder now happens 30 days before expiration, on a controller's reconcile timer, and propagates to every consumer within seconds. The only ongoing human task is rotating the Route 53 IAM access key on whatever schedule you keep for static credentials.

Now I can easily set up new apps with HTTPS and not worry about rotating the certificates.

## Sources

- [cert-manager][2]
- [Let's Encrypt][3]
- [Amazon Route 53][4]
- [Reflector][5]
- [External Secrets Operator][6]
- [Sealed Secrets][7]
- [Argo CD multi-source applications][8]
- [cert-manager Route 53 DNS-01 documentation][9]
- [cert-manager Certificate resource documentation][10]
- [Let's Encrypt rate limits][11]
- [EKS Pod Identity][12]
- [IAM Roles for Service Accounts][13]
- [Helm][14]

[1]: /posts/homelab-wildcard-cert
[2]: https://cert-manager.io/
[3]: https://letsencrypt.org/
[4]: https://aws.amazon.com/route53/
[5]: https://github.com/emberstack/kubernetes-reflector
[6]: https://external-secrets.io/
[7]: https://sealed-secrets.netlify.app/
[8]: https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/
[9]: https://cert-manager.io/docs/configuration/acme/dns01/route53/
[10]: https://cert-manager.io/docs/usage/certificate/#creating-certificate-resources
[11]: https://letsencrypt.org/docs/rate-limits/
[12]: https://docs.aws.amazon.com/eks/latest/userguide/pod-identities.html
[13]: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
[14]: https://helm.sh/
