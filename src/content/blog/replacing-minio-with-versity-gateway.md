---
title: Replacing MinIO with Versity Gateway on Kubernetes
author: aj
date: 2026-10-17
image: /images/replacing-minio-with-versity-gateway/cover.png
description: 'Community MinIO is no longer maintained. How I replaced a NAS-backed S3 backup service with Versity Gateway, tested recovery, and preserved the archive—with Helm examples for Kubernetes.'
categories:
  - Homelab
  - Kubernetes
  - Database Management
tags:
  - minio
  - versity
  - s3
  - backup
  - kubernetes
  - helm
  - cloudnativepg
  - postgres
  - nfs
  - homelab
---

I do not believe I have posted about MinIO previously. MinIO is a self-hosted object storage server that provides an AWS S3-compatible API. In plainer terms, it gave applications a place to store files over the network, somewhat like self-hosted Dropbox or Google Drive.

The [community MinIO repository][minio] shifted to source-only distribution, was archived on April 25, 2026, and its README says the project is no longer maintained. Pre-built `minio/minio` container images are also no longer available from the former public repositories on Docker Hub and Quay, and the README points users toward AIStor Free and Enterprise instead. I needed a new solution.

I was not privy to this change until the MinIO Docker image failed to pull in my personal k3s cluster. The server was down for roughly nine hours, and two databases were failing to archive write-ahead logs (WAL). I recovered it temporarily on a worker that still had the image cached so I could export files over the API. That cached image was only a temporary workaround.

MinIO used to be a fairly boring part of my Postgres backup setup. Three databases sent backups and WAL segments to an S3 bucket. MinIO supplied the API, a NAS supplied the storage, and CloudNativePG's Barman plugin did the backup work.

## Choosing a replacement for MinIO

My requirement was quite small: replace an S3 endpoint over an existing NAS while keeping my database backup system usable. The databases use node-local storage; the backup archive lives on a separate NFS server.

I looked at other self-hosted object stores, including Garage, SeaweedFS, Ceph, RustFS, and a maintained MinIO fork. The decision depended on the storage constraint. A distributed object store makes sense when you want to manage independent storage across machines. Adding more pods against my one NAS would only complicate my infrastructure where there is already a single point of failure.

[Versity Gateway][versity] fit my requirements. It exposes a filesystem through S3, has an Apache-2.0 license, and publishes an [upstream Helm chart][chart]. Its POSIX backend documents metadata storage and NFS behavior. This means I can slot it into my existing infrastructure.

The resulting architecture is:

```text
Postgres -> CNPG/Barman -> S3 API -> Versity Gateway -> NFS storage
```

The NAS still matters just as much as it did before. Versity does not turn one NAS into a replicated storage system. This choice solves the maintenance problem at the S3 layer and keeps the deployment small.

There was another constraint: the NAS already contained the only copy of some recovery history. I needed a separate PVC for the trial. **A MinIO data directory is not a plain bucket directory you can hand to a different S3 server.** MinIO writes objects in its own internal format with metadata files rather than plain POSIX files, so the migration had to go through the S3 API.

## Testing Versity Gateway with Helm

I started with a direct Helm installation and moved it into Argo CD after it passed the backup tests. If you want to follow along you can use Helm; the gateway does not require Argo CD.

### Prerequisites to follow along

The examples below use chart `0.4.5` and gateway `v1.8.0`—the versions I tested. Chart and application versions are independent. Keep both pinned when evaluating, and read the release notes before upgrading either.

You will need a Kubernetes cluster, Helm, `kubectl`, a writable NFS-backed StorageClass, and an AWS CLI for the S3 checks. The later database examples assume CloudNativePG and its Barman Cloud plugin are already installed. All examples use a namespace named `backups`; adapt it to your cluster.

You could also just run Versity Gateway as a Docker container.

### Give Versity its own storage

Create a k8s namespace:

```bash
kubectl create namespace backups --dry-run=client -o yaml | kubectl apply -f -
```

Save this as `storage.yaml`. Substitute your StorageClass for `nfs-client` if it has a different name.

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: versity-data
  namespace: backups
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: nfs-client
  resources:
    requests:
      storage: 50Gi
```

The claim is created separately from the Helm release. If you uninstall the Helm chart, this will need to be cleaned up separately.

### Keep credentials out of Helm values

The chart accepts an existing Secret with `rootAccessKeyId` and `rootSecretAccessKey`. I use External Secrets with Bitwarden in my homelab, but any mechanism that supplies a Kubernetes Secret works. There is no need to install my secret-management stack to try this.

For a local evaluation, create `secrets.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: versity-root
  namespace: backups
type: Opaque
stringData:
  rootAccessKeyId: admin
  rootSecretAccessKey: REPLACE_WITH_A_LONG_RANDOM_ADMIN_SECRET
---
apiVersion: v1
kind: Secret
metadata:
  name: cnpg-backup-s3-credentials
  namespace: backups
type: Opaque
stringData:
  access-key-id: cnpg-backup
  secret-access-key: REPLACE_WITH_THE_BACKUP_ACCOUNT_SECRET
```

Supply real values through your secret tooling, or apply a local file excluded from Git. When migrating existing consumers, preserve their backup account's access key and secret instead of quietly generating a new pair. Referencing a Secret also avoids putting secret values into Helm release history through `--set`.

```bash
kubectl apply -f storage.yaml
kubectl apply -f secrets.yaml
```

### Persist the metadata and the identities too

Save this as `values.yaml`:

```yaml
fullnameOverride: versitygw
replicaCount: 1
strategy:
  type: Recreate
image:
  repository: ghcr.io/versity/versitygw
  tag: v1.8.0
  pullPolicy: IfNotPresent
auth:
  existingSecret: versity-root
gateway:
  port: 7070
  region: us-east-1
  backend:
    type: posix
    args: /mnt/data
    sidecarDir: /mnt/metadata
iam:
  enabled: true
  type: internal
  dir: /mnt/iam
admin:
  enabled: true
  port: 7071
service:
  type: ClusterIP
persistence:
  enabled: true
  create: false
  claimName: versity-data
podSecurityContext:
  runAsNonRoot: true
  runAsUser: 1000
  runAsGroup: 1000
  fsGroup: 1000
  fsGroupChangePolicy: OnRootMismatch
  seccompProfile:
    type: RuntimeDefault
securityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop: [ALL]
initContainers:
  - name: prepare-storage
    image: ghcr.io/versity/versitygw:v1.8.0
    command: [/bin/sh, -ec]
    args:
      - mkdir -p /storage/data /storage/metadata /storage/iam
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop: [ALL]
    volumeMounts:
      - name: data
        mountPath: /storage
resources:
  requests:
    cpu: 100m
    memory: 256Mi
  limits:
    memory: 1Gi
```

The chart mounts three `subPath` directories from the `versity-data` PVC into `/mnt/data`, `/mnt/metadata`, and `/mnt/iam` on the gateway container:

| Directory   | Purpose                            |
| ----------- | ---------------------------------- |
| `data/`     | Bucket and object contents         |
| `metadata/` | Persistent S3 metadata             |
| `iam/`      | Internal user and credential state |

The [POSIX backend][posix] normally uses extended attributes for metadata. I chose durable sidecar files so that metadata has an explicit place on NFS. Snapshot and restore all three directories together.

The init container mounts the root of the PVC at `/storage` and prepares those three subdirectories as UID/GID `1000`. Your NFS export must permit that identity to create and write them; `fsGroup` cannot fix every server-side ownership or root-squash arrangement. Restrict scheduling to nodes allowed to mount the export if your NAS has an allowlist.

One replica and `Recreate` are deliberate. They avoid overlapping gateway writers during updates and match the internal IAM setup I tested. `ReadWriteOnce` alone is not a one-process lock.

The resource settings are a starting point from my small deployment, not a sizing recommendation for every workload. Watch memory and NAS latency during your own backup trial.

### Render, then install

Before installing, render the manifests that Helm will generate and validate them with a client-side dry run:

```bash
helm template versitygw oci://ghcr.io/versity/versitygw/charts/versitygw \
  --version 0.4.5 --namespace backups --values values.yaml \
  > rendered.yaml

kubectl apply --dry-run=client --namespace backups -f rendered.yaml
```

When ready, install the release with Helm:

```bash
helm upgrade --install versitygw oci://ghcr.io/versity/versitygw/charts/versitygw \
  --version 0.4.5 --namespace backups --values values.yaml \
  --wait --timeout 5m
```

This exposes S3 on `7070` and a separate admin API on `7071`, both through a ClusterIP Service. Keeping ingress out of the initial evaluation avoids tying the example to a particular ingress controller. Add TLS and your cluster's access controls before exposing it to other networks.

## Give backups their own account

A root account is useful for setting up the gateway. It should not be the account sitting in every database's backup configuration.

The following `bootstrap.yaml` uses the two Secrets above to create an ordinary user and a bucket that user owns. It can be rerun after updating the backup secret. This is a normal Kubernetes Job, with no Argo hook annotations.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: versity-bootstrap
  namespace: backups
spec:
  backoffLimit: 2
  activeDeadlineSeconds: 180
  template:
    spec:
      restartPolicy: OnFailure
      automountServiceAccountToken: false
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: bootstrap
          image: ghcr.io/versity/versitygw:v1.8.0
          command: [/bin/sh, -ec]
          args:
            - |
              users="$(versitygw admin list-users)"
              if printf '%s\n' "$users" | awk '{print $1}' | grep -qx "$BACKUP_ACCESS"; then
                versitygw admin update-user --access "$BACKUP_ACCESS" --secret "$BACKUP_SECRET" --role user --user-id 1000 --group-id 1000
              else
                versitygw admin create-user --access "$BACKUP_ACCESS" --secret "$BACKUP_SECRET" --role user --user-id 1000 --group-id 1000
              fi
              buckets="$(versitygw admin list-buckets)"
              if ! printf '%s\n' "$buckets" | awk '{print $1}' | grep -qx cnpg-backups; then
                versitygw admin create-bucket --bucket cnpg-backups --owner "$BACKUP_ACCESS"
              fi
              versitygw admin change-bucket-owner --bucket cnpg-backups --owner "$BACKUP_ACCESS"
          env:
            - name: ADMIN_ENDPOINT_URL
              value: http://versitygw.backups.svc.cluster.local:7071
            - name: ADMIN_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: versity-root
                  key: rootAccessKeyId
            - name: ADMIN_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: versity-root
                  key: rootSecretAccessKey
            - name: BACKUP_ACCESS
              valueFrom:
                secretKeyRef:
                  name: cnpg-backup-s3-credentials
                  key: access-key-id
            - name: BACKUP_SECRET
              valueFrom:
                secretKeyRef:
                  name: cnpg-backup-s3-credentials
                  key: secret-access-key
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: [ALL]
```

This file is also outside of the Helm install. To install it:

```bash
kubectl apply --dry-run=client -f bootstrap.yaml
kubectl apply -f bootstrap.yaml
kubectl wait --namespace backups job/versity-bootstrap \
  --for=condition=complete --timeout=180s
```

To rerun it after a credential rotation, delete that completed Job and apply the file again. Changing a Kubernetes Secret alone does not update the user's password in persistent IAM. The gateway's administrator credentials are environment-based, so rotating those also requires restarting the gateway.

## Testing the new gateway

A working S3 client is the first test.

In another terminal, forward the S3 port:

```bash
kubectl port-forward --namespace backups service/versitygw 17070:7070
```

Configure an AWS CLI profile with the backup user's credentials and region `us-east-1`. Use path-style addressing:

```bash
aws configure --profile versity-backup
aws configure set s3.addressing_style path --profile versity-backup
```

Run a write/read comparison with a file large enough for the AWS CLI's default multipart upload threshold:

```bash
S3_ENDPOINT=http://127.0.0.1:17070
PROBE_KEY="evaluation/$(date +%s)-multipart.bin"

head -c 16777216 /dev/urandom > sample.bin
aws --profile versity-backup --endpoint-url "$S3_ENDPOINT" \
  s3 cp sample.bin "s3://cnpg-backups/$PROBE_KEY"
aws --profile versity-backup --endpoint-url "$S3_ENDPOINT" \
  s3 cp "s3://cnpg-backups/$PROBE_KEY" downloaded.bin
cmp sample.bin downloaded.bin
aws --profile versity-backup --endpoint-url "$S3_ENDPOINT" \
  s3 rm "s3://cnpg-backups/$PROBE_KEY"
```

I also tested list/head/delete, server-side copy, and access to an administrator-owned bucket being denied to the backup user. NFS behavior matters here: multipart assembly and copying are filesystem operations underneath the S3 interface.

These checks established that clients could use the endpoint. I still needed to establish that Barman could recover a database from it.

## Testing a database backup

Basic S3 checks do not prove a database can recover. I wanted to test restoring a backup before calling this project done.

Create a new [Barman ObjectStore][object-stores] rather than editing the old shared destination in place. Save this as `object-store.yaml`:

```yaml
apiVersion: barmancloud.cnpg.io/v1
kind: ObjectStore
metadata:
  name: cnpg-backups-versity
  namespace: backups
spec:
  retentionPolicy: 30d
  configuration:
    destinationPath: s3://cnpg-backups/
    endpointURL: http://versitygw.backups.svc.cluster.local:7070
    s3Credentials:
      accessKeyId:
        name: cnpg-backup-s3-credentials
        key: access-key-id
      secretAccessKey:
        name: cnpg-backup-s3-credentials
        key: secret-access-key
    wal:
      compression: gzip
    data:
      compression: gzip
```

The ObjectStore and its credential Secret must be in the namespace of the CNPG Cluster that consumes them. The gateway can be in a different namespace; its Service URL is what crosses that boundary. For an existing database outside `backups`, provision those two resources in its namespace too.

With the plugin installed, validate the custom resource against the API server:

```bash
kubectl apply --dry-run=server -f object-store.yaml
kubectl apply -f object-store.yaml
```

I first used a disposable database. Save this as `test-cluster.yaml`; its data uses your cluster's default database StorageClass (choose one appropriate for your cluster, separate from the gateway's claim):

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: app-db
  namespace: backups
spec:
  instances: 1
  imageName: ghcr.io/cloudnative-pg/postgresql:18.3-system-trixie
  bootstrap:
    initdb:
      database: app
      owner: app
  storage:
    size: 5Gi
  plugins:
    - name: barman-cloud.cloudnative-pg.io
      enabled: true
      isWALArchiver: true
      parameters:
        barmanObjectName: cnpg-backups-versity
```

```bash
kubectl apply --dry-run=server -f test-cluster.yaml
kubectl apply -f test-cluster.yaml
kubectl wait --namespace backups cluster/app-db \
  --for=condition=Ready --timeout=10m
kubectl exec --namespace backups app-db-1 -c postgres -- \
  psql -d app -v ON_ERROR_STOP=1 -c \
  "CREATE TABLE recovery_probe (marker text); INSERT INTO recovery_probe VALUES ('before-backup');"
```

Request a base backup with `backup.yaml`:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Backup
metadata:
  name: app-db-versity-test
  namespace: backups
spec:
  cluster:
    name: app-db
  method: plugin
  pluginConfiguration:
    name: barman-cloud.cloudnative-pg.io
```

```bash
kubectl apply --dry-run=server -f backup.yaml
kubectl apply -f backup.yaml
kubectl wait --namespace backups backup/app-db-versity-test \
  --for=jsonpath='{.status.phase}'=completed --timeout=10m
```

Then write a second marker and switch WAL segments:

```bash
kubectl exec --namespace backups app-db-1 -c postgres -- \
  psql -d app -v ON_ERROR_STOP=1 -c \
  "INSERT INTO recovery_probe VALUES ('after-backup');" \
  -c 'SELECT pg_switch_wal();'
kubectl logs --namespace backups app-db-1 -c plugin-barman-cloud --tail=20
```

Confirm the plugin logs report successful WAL archival to the new endpoint. A successful base upload is not the end of that test. Use a second CNPG Cluster to [restore the archive][cnpg-restore]. For example, `restore.yaml` can look like this if the source database runs PostgreSQL 18:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: app-db-restore
  namespace: backups
spec:
  instances: 1
  imageName: ghcr.io/cloudnative-pg/postgresql:18.3-system-trixie
  storage:
    size: 5Gi
  bootstrap:
    recovery:
      source: original
  externalClusters:
    - name: original
      plugin:
        name: barman-cloud.cloudnative-pg.io
        parameters:
          barmanObjectName: cnpg-backups-versity
          serverName: app-db
```

```bash
kubectl apply --dry-run=server -f restore.yaml
kubectl apply -f restore.yaml
kubectl wait --namespace backups cluster/app-db-restore \
  --for=condition=Ready --timeout=15m
```

Match the source's PostgreSQL major version and required extensions. The important `serverName` is the originating cluster's archive name, not the restore cluster's name. The restore spec deliberately has no archiving plugin of its own: it reads the source archive without writing a new backup chain into it.

Once the restore is ready, query the markers:

```bash
kubectl exec --namespace backups app-db-restore-1 -c postgres -- \
  psql -d app -c 'TABLE recovery_probe;'
```

Both `before-backup` and `after-backup` should be present. The second row requires replaying WAL produced after the base backup. For a real database, compare application data and check extensions too. Exercise point-in-time recovery (PITR) with a target between two writes, then reschedule the gateway and repeat reads and a backup. Test retention deletion in a disposable archive and restore again afterward.

Those were the gates I used before migrating production. They test the storage export, the gateway, and the actual backup client together.

## Keep the old recovery history usable

I already had base backups, WAL, and Barman catalog files in MinIO, and wanted to keep them all usable.

You can keep the old server available for historical restores until its retention window expires, or copy the complete archive to the replacement. Since reinstalling the old server was already not possible, I chose to copy.

For a small **unversioned** archive, a local staging directory makes the transfer easy to understand. Configure a `minio-export` AWS profile with permission to read the old bucket, and keep the `versity-backup` profile for the destination. Set `MINIO_ENDPOINT` to an address you can reach; another port-forward works for an in-cluster source.

```bash
set -euo pipefail
MINIO_ENDPOINT=http://127.0.0.1:19000
VERSITY_ENDPOINT=http://127.0.0.1:17070
mkdir -p minio-export versity-readback

aws --profile minio-export --endpoint-url "$MINIO_ENDPOINT" \
  s3 cp s3://cnpg-backups/ ./minio-export/ --recursive
aws --profile versity-backup --endpoint-url "$VERSITY_ENDPOINT" \
  s3 cp ./minio-export/ s3://cnpg-backups/ --recursive
aws --profile versity-backup --endpoint-url "$VERSITY_ENDPOINT" \
  s3 cp s3://cnpg-backups/ ./versity-readback/ --recursive

(
  cd minio-export
  find . -type f -print0 | sort -z | xargs -0 sha256sum
) > source.sha256

(
  cd versity-readback
  sha256sum --check ../source.sha256
)
```

This Linux/GNU-tools example checks the bytes of every staged source object after reading them back from Versity. It needs enough local disk for two copies. It does not preserve object versions, tags, or arbitrary S3 metadata; use a migration client that handles those if your application depends on them. Check bucket versioning before choosing this approach. My production migration used a streaming S3 client that also preserved object metadata, with SHA-256 comparisons rather than treating multipart ETags as whole-object checksums.

A running database keeps adding WAL, so the initial copy is only an initial copy. Restore from the copied archive first. Then change one production Cluster's `barmanObjectName` to the new ObjectStore, confirm WAL reaches Versity, and take a new base backup. Repeat for each consumer. After all writers have moved, copy the remaining old objects and verify again. Avoid letting a scheduled base backup remain in progress on the source during the final pass.

Do not mirror deletions into the destination during this handoff. New backups may already exist only on Versity. Leave WAL retention to Barman's recovery-window calculations instead of adding an independent bucket-age rule.

I ended up verifying 10,916 objects, roughly 3.6GB. Each production database restored from the copied history, and each fresh Versity backup restored too. The TimescaleDB consumer came back with its extension, 22 chunks, and more than five million rows. The final pass after repointing all database consumers and the S3 endpoint found no additional objects to copy.

I kept MinIO's original PVC intact and archived the old manifests. That preserves a historical copy, but MinIO is no longer available moving forward.

## Implementing in Argo CD

Once the tests passed, I put the chart reference, values, and supporting resources into a multi-source Argo CD Application. The ordinary bootstrap Job became a PostSync hook, and I switched to External Secrets for the credentials.

If you make the same transition, adopt the existing workload and storage before removing Helm release records. Running `helm uninstall` against resources Argo CD has adopted can delete the running service. I also found that some old Helm-owned admin listener fields survived server-side apply and needed cleanup before the desired configuration took effect.

## Next steps

I have tested restores into new database Clusters, PITR in the trial, retention, and gateway rescheduling. I have not yet tested recovering the gateway from a NAS snapshot or rebuilding recovery in a completely separate Kubernetes cluster. A second copy outside this NAS is also still needed in case of NAS failure.

Replacing MinIO gave me a maintained project that fits the storage I have, and a migration with evidence that the old and new backups are readable. The work worth repeating is choosing around your storage constraints, keeping the existing archive available, testing the actual backup client, and restoring before retiring the service that used to hold your backups.

[minio]: https://github.com/minio/minio
[versity]: https://github.com/versity/versitygw
[chart]: https://github.com/versity/versitygw/tree/main/chart
[posix]: https://github.com/versity/versitygw/wiki/POSIX-Backend
[object-stores]: https://cloudnative-pg.io/plugin-barman-cloud/docs/object_stores/
[cnpg-restore]: https://cloudnative-pg.io/plugin-barman-cloud/docs/usage/
