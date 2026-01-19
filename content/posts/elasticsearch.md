---
title: Elasticsearch
author: aj
image: /images/elastic_logo.png
date: 2025-04-03

categories:
  - Database Management
tags:
  - elasticsearch
  - database
  - software
---


Elasticsearch is a distributed, RESTful search and analytics engine designed for scalability and flexibility. It allows you to store, search, and analyze large volumes of data quickly and efficiently. Elasticsearch is part of the Elastic Stack. This is a powerful platform that has many strengths when most of your data is text based and you may need to search for text. It supports horizontal scaling and stores data in an Index. You can have data replicated into shards to achieve High Availability.

Some example use cases:

- Log Management: Elasticsearch is widely used for log aggregation and analysis, often paired with Logstash and Kibana (ELK Stack).
- Full Text Search: It powers search functionality on text based data providing features like autocomplete, filtering, and sorting.
- Analytics and Reporting: Elasticsearch is used for real-time analytics and generating reports from large datasets.
- Time-Series Data: It can handle time-series data, making it suitable for monitoring IT infrastructure and IoT applications.

Since `v7.11`, These products are distributed under non open-source license (Dual licensed under Server Side Public License and Elastic License). The code was later open-sourced in late 2024 under a new AGPL license.

## Components

Elasticsearch has the following components:

- Cluster: A group of one or more nodes that work together to store your data and provide query capabilities.
- Node: An instance of Elasticsearch that stores some part of the data and participates in the cluster's indexing and search operations.
- Index: Similar to a database in relational databases; an index is where the actual data is stored, organized into documents.
- Document: The basic unit of information in Elasticsearch. Stored as JSON objects, with fields that can be of various types (text, number, date, etc.).

## Testing Elastic

### Docker

One of the fastest ways to start testing Elasticsearch with all features is to use Docker containers. Check out [my previous post][1] on containers and Docker if you are not familiar with the technology.

Create a network for the containers:

```bash
docker network create elastic
```

In my examples I am using v8 which you can run in open source mode but when you first start the system, it will be in Enterprise trial mode for 30 days.

To create a single node Elasticsearch cluster that is insecure (http vs https) and enable enterprise trial mode:

```bash
docker run -p 9200:9200 -d --name elasticsearch \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  -e "xpack.license.self_generated.type=trial" \
  -v "elasticsearch-data:/usr/share/elasticsearch/data" \
  --net elastic \
  docker.elastic.co/elasticsearch/elasticsearch:8.17.1
```

If you just want the basic features of Elasticsearch, do not include the option for the trial.

```txt
-   -e "xpack.license.self_generated.type=trial" \
```

The data can be visualized with Kibana. To create a Kibana container, ensure it is using the same container network:

```bash
docker run -d --name kibana --net elastic -p 5601:5601 kibana:8.17.1
```

This is a quick way to test both of these services. If using Docker the Elasticsearch API will be available on port 9200 and Kibana on port 5601.

### Kubernetes

If you have a k8s cluster, you can install Elasticsearch by using an Operator. The Elastic Operator for Kubernetes.

**1. Setup the namespace for a new Elasticsearch cluster**

* **Create a Namespace or use an existing:**
    * Create a dedicated Kubernetes `namespace` for the Elastic Stack cluster.

        ```bash
        kubectl create namespace $YOUR_NAMESPACE
        ```

**2.  Install the ECK Operator if it is not present in your k8s cluster**

* **Choose an Installation Method:**
    * You can install ECK using either YAML manifests or Helm. There is more information and the author should check the official documentation to ensure this is up to date [Elasticsearch deploy ECK][2]

* **Method 1: Install with YAML Manifests**

    * Download the ECK Custom Resource Definitions (CRDs) and operator manifest:

        ```bash
        curl -O https://download.elastic.co/downloads/eck/2.16.1/crds.yaml
        curl -O https://download.elastic.co/downloads/eck/2.16.1/operator.yaml
        ```

        *(Note: Adjust the version number to the desired ECK version.)*
    * Apply the CRDs and operator manifest:

        ```bash
        kubectl apply -f crds.yaml # cluster-wide so skip if you already have these
        ```

        There are several CRD objects:

        ```log
        customresourcedefinition.apiextensions.k8s.io/agents.agent.k8s.elastic.co created
        customresourcedefinition.apiextensions.k8s.io/apmservers.apm.k8s.elastic.co created
        customresourcedefinition.apiextensions.k8s.io/beats.beat.k8s.elastic.co created
        customresourcedefinition.apiextensions.k8s.io/elasticmapsservers.maps.k8s.elastic.co created
        customresourcedefinition.apiextensions.k8s.io/elasticsearches.elasticsearch.k8s.elastic.co created
        customresourcedefinition.apiextensions.k8s.io/enterprisesearches.enterprisesearch.k8s.elastic.co created
        customresourcedefinition.apiextensions.k8s.io/kibanas.kibana.k8s.elastic.co created
        customresourcedefinition.apiextensions.k8s.io/logstashes.logstash.k8s.elastic.co created
        ```

        Create the namespace for the operator if it does not exist:

        ```bash
        kubectl create namespace $YOUR_NAMESPACE # this is the namespace for the operator not a cluster
        ```

        Install the operator by installing the manifest:

        ```bash
        kubectl apply -n $YOUR_NAMESPACE -f operator.yaml
        ```

* **Method 2: Install with Helm**

    * Add the Elastic co Helm repository:

        ```bash
        helm repo add elastic https://helm.elastic.co
        helm repo update
        ```
    * Install the ECK operator and create the `$YOUR_NAMESPACE` namespace for the operator resources:
        ```bash
        helm install elastic-operator elastic/eck-operator -n $YOUR_NAMESPACE --create-namespace
        ```

* **Verify Operator Installation:**
    * Check if the ECK operator pod is running:

        ```bash
        kubectl get pods -n $YOUR_NAMESPACE
        ```

        * Ensure the `elastic-operator` pod has a `Running` status.

**3.  Deploy an Elasticsearch Cluster**

* **Create an Elasticsearch Manifest:**
    * Define the desired Elasticsearch cluster configuration in a YAML file (e.g., `elasticsearch.yaml`). See the official documentation for an example that may be more up to date. [Deploy an Elasticsearch cluster][3]

        ```yaml
        apiVersion: elasticsearch.k8s.elastic.co/v1
        kind: Elasticsearch
        metadata:
          name: $YOUR_ES_CLUSTER
          namespace: $YOUR_NAMESPACE
        spec:
          version: 8.17.4 # Specify your desired Elasticsearch version
          nodeSets:
          - name: default
            count: 1  # Number of Elasticsearch nodes
            config:
              node.store.allow_mmap: false # Important for non prod nodes
        ```

* **Apply the Manifest:**
    * Deploy the Elasticsearch cluster to Kubernetes:

        ```bash
        kubectl apply -f elasticsearch.yaml -n $YOUR_NAMESPACE
        ```

* **Monitor Deployment:**
    * Check the status of the Elasticsearch cluster:

        ```bash
        kubectl get elasticsearch -n $YOUR_NAMESPACE
        ```
    * Monitor the Elasticsearch pods:
        ```bash
        kubectl get pods -n $YOUR_NAMESPACE -l elasticsearch.k8s.elastic.co/cluster-name=$YOUR_ES_CLUSTER
        ```

    * Wait until all Elasticsearch pods are in the `Running` state.

**4.  Access Elasticsearch**

* **Access Elasticsearch:**
    * Identify the service name in your cluster that the Operator has configured automatically. Use this to set up `kube-proxy` to port forward to your local machine using `kubectl`.

        ```bash
        kubectl get svc -n $YOUR_NAMESPACE

        # Example port forward command
        kubectl port-forward svc/$YOUR_ES_CLUSTER-es-http 9200 -n $YOUR_NAMESPACE
        ```

    * Use `curl` or a browser to access the Elasticsearch API.

        ```bash
        curl -X GET https://localhost:9200/_cluster/health -k
        ```

    * You should see JSON output from the Elasticsearch cluster.

**5.  Scale the Elasticsearch Cluster**

* **Scale Up:**
    * Edit the `elasticsearch.yaml` file and increase the `count` in the `nodeSets` section (e.g., from 1 to 3).
    * Apply the updated manifest:

        ```bash
        kubectl apply -f elasticsearch.yaml -n $YOUR_NAMESPACE
        ```

* **Verify Scaling:**
    * Observe the creation of new Elasticsearch pods:

        ```bash
        kubectl get pods -n $YOUR_NAMESPACE -l elasticsearch.k8s.elastic.co/cluster-name=$YOUR_ES_CLUSTER
        ```


6. Cleanup
* **Delete Resources:**
    * Delete the Elasticsearch deployment, service, and operator.

        ```bash
        kubectl delete -f elasticsearch.yaml -n $YOUR_NAMESPACE

        # to clean up the operator
        # If installed with YAML:
        kubectl delete -f operator.yaml -n $YOUR_NAMESPACE
        kubectl delete -f crds.yaml
        # If installed with Helm:
        helm uninstall elastic-operator -n $YOUR_NAMESPACE
        kubectl delete namespace $YOUR_NAMESPACE
        ```

## Adding data to Elasticsearch

You can add JSON documents by using the REST API:

Make a `PUT` request using your REST client of choice to your Elasticsearch API. The content type is `application/json`:

```json
// PUT /my_index/_doc/1
{
  "title": "Elasticsearch Guide",
  "content": "Learn how to use Elasticsearch for search and analytics.",
  "date": "2025-04-03"
}
```

To query that data, make a `GET` request:

```json
// GET /my_index/_search
{
  "query": {
    "match": {
      "content": "search"
    }
  }
}
```

For example with CURL to upload and query data:

```bash
curl -X PUT http://localhost:9200/my_index/_doc/1 \
  -H 'Content-Type: application/json' \
  -d '{"name": "John Doe", "age": 30}'
```

To search:

```bash
curl -X GET "http://localhost:9200/my_index/_search?q=john"
```

You can scale your data from one document to petabytes of data.

 [1]: /posts/containers/
 [2]: https://www.elastic.co/guide/en/cloud-on-k8s/current/k8s-deploy-eck.html
 [3]: https://www.elastic.co/guide/en/cloud-on-k8s/current/k8s-deploy-elasticsearch.html