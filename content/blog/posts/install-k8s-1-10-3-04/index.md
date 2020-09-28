---
title: 虚拟机部署 Kubernetes v1.10.3  高可用集群 - 04 部署 Node
date: 2018-05-30 17:45
tags: 
  - Jenkins
  - Java
  - Kubernetes
---

在开始部署前，先在 kube-m1 将需要用到的文件复制到所有 node 节点上：

```bash
$ cd /etc/kubernetes/ssl

$ for NODE in kube-n1 kube-n2 kube-n3; do
    echo "--- $NODE ---"
    ssh ${NODE} "mkdir -p /etc/kubernetes/ssl/"
    ssh ${NODE} "mkdir -p /etc/etcd/ssl"
    # Etcd
    for FILE in etcd.pem etcd-key.pem; do
      scp /etc/etcd/ssl/${FILE} ${NODE}:/etc/etcd/ssl/${FILE}
    done
    # Kubernetes
    for FILE in ssl/ca.pem ssl/ca-key.pem bootstrap-kubelet.conf; do
      scp /etc/kubernetes/${FILE} ${NODE}:/etc/kubernetes/${FILE}
    done
done
```
### 部署与设定

以下所有操作需要在每台 Node 节点上都进行一遍。

在每台 node 节点配置 kubelet.service 相关文件来管理 kubelet：

安装 cni 网络 插件：

```bash
$ mkdir -p /opt/cni/bin && cd /opt/cni/bin
$ export CNI_URL="https://github.com/containernetworking/plugins/releases/download"
$ wget -qO- "${CNI_URL}/v0.6.0/cni-plugins-amd64-v0.6.0.tgz" | tar -zx
```

配置 kubelet.service：

```bash
$ cat > /usr/lib/systemd/system/kubelet.service <<EOF
[Unit]
Description=Kubernetes Kubelet
Documentation=https://github.com/GoogleCloudPlatform/kubernetes
After=docker.service
Requires=docker.service

[Service]
Environment="KUBELET_KUBECONFIG_ARGS=--bootstrap-kubeconfig=/etc/kubernetes/bootstrap-kubelet.conf --kubeconfig=/etc/kubernetes/kubelet.conf"
Environment="KUBELET_SYSTEM_PODS_ARGS=--pod-manifest-path=/etc/kubernetes/manifests --allow-privileged=true"
Environment="KUBELET_NETWORK_ARGS=--network-plugin=cni --cni-conf-dir=/etc/cni/net.d --cni-bin-dir=/opt/cni/bin"
Environment="KUBELET_DNS_ARGS=--cluster-dns=10.254.0.2 --cluster-domain=cluster.local"
Environment="KUBELET_AUTHZ_ARGS=--authorization-mode=Webhook --client-ca-file=/etc/kubernetes/ssl/ca.pem"
Environment="KUBELET_CADVISOR_ARGS=--cadvisor-port=0"
Environment="KUBELET_CERTIFICATE_ARGS=--rotate-certificates=true --cert-dir=/var/lib/kubelet/ssl"
Environment="KUBELET_EXTRA_ARGS=--node-labels=node-role.kubernetes.io/node='' --logtostderr=true --v=0 --fail-swap-on=false --cgroup-driver=systemd"
ExecStart=/usr/local/bin//kubelet \$KUBELET_KUBECONFIG_ARGS \$KUBELET_SYSTEM_PODS_ARGS \$KUBELET_NETWORK_ARGS \$KUBELET_DNS_ARGS \$KUBELET_AUTHZ_ARGS \$KUBELET_CADVISOR_ARGS \$KUBELET_CERTIFICATE_ARGS \$KUBELET_EXTRA_ARGS
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

最后建立 var 存放信息，然后启动 kubelet 服务:

```bash
$ mkdir -p /var/lib/kubelet /var/log/kubernetes

$ systemctl enable kubelet.service && systemctl start kubelet.service
```

### 验证集群

在任意 Mater 执行以下命令：
```bash
$ kubectl get csr
csr-xtvv5                                              1h        system:node:kube-m1       Approved,Issued
csr-bm696                                              1h        system:node:kube-m2       Approved,Issued
csr-s95db                                              1h        system:node:kube-m3       Approved,Issued
node-csr-7EpNHKBXNxc75nKEbT10qweZ5tPNSVYSW9lHhgXP_io   5m        system:bootstrap:c63cdb   Approved,Issued
node-csr-MLS26OAthEDtOVKcu9UYoA6sldkUEj49MTv278z-w7o   1m        system:bootstrap:c63cdb   Approved,Issued
node-csr-rJUWN98SoxqdtTcfToALKB7Whj55wl4WPGcGxLQBIHo   1m        system:bootstrap:c63cdb   Approved,Issued

$ kubectl get nodes
kube-m1   NotReady   master    1h        v1.10.3
kube-m2   NotReady   master    1h        v1.10.3
kube-m3   NotReady   master    1h        v1.10.3
kube-n1   NotReady   node      7m        v1.10.3
kube-n2   NotReady   node      2m        v1.10.3
kube-n3   NotReady   node      2m        v1.10.3
```

### Kubernetes Core Addons 部署

当完成上面所有步骤后，接着需要部署一些插件，如 Kubernetes DNS 与 Kubernetes Proxy 等。

#### Kubernetes Proxy

Kube-proxy 是实现 Service 的关键插件，kube-proxy 会在每台节点上执行，然后监听 API Server 的 Service 与 Endpoint 资源物件的改变，然后来依据变化执行 iptables 来实现网络的转发。这边我们会需要建议一个 DaemonSet 来执行，并且建立一些需要的 Certificates。

在 kube-m1 配置 kube-proxy.yml 来安装 Kubernetes Proxy 插件：

```bash
$ mkdir /etc/kubernetes/addon && cd /etc/kubernetes/addon
$ cat > /etc/kubernetes/addon/kube-proxy.yml <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kube-proxy
  namespace: kube-system
  labels:
    addonmanager.kubernetes.io/mode: Reconcile
---
kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1beta1
metadata:
  name: system:kube-proxy
  labels:
    addonmanager.kubernetes.io/mode: Reconcile
subjects:
  - kind: ServiceAccount
    name: kube-proxy
    namespace: kube-system
roleRef:
  kind: ClusterRole
  name: system:node-proxier
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: v1
kind: ConfigMap
metadata:
  labels:
    app: kube-proxy
  name: kube-proxy
  namespace: kube-system
data:
  config.conf: |-
    apiVersion: kubeproxy.config.k8s.io/v1alpha1
    bindAddress: 0.0.0.0
    clientConnection:
      acceptContentTypes: ""
      burst: 10
      contentType: application/vnd.kubernetes.protobuf
      kubeconfig: /var/lib/kube-proxy/kubeconfig.conf
      qps: 5
    clusterCIDR: 172.30.0.0/16
    configSyncPeriod: 15m0s
    conntrack:
      max: null
      maxPerCore: 32768
      min: 131072
      tcpCloseWaitTimeout: 1h0m0s
      tcpEstablishedTimeout: 24h0m0s
    enableProfiling: false
    healthzBindAddress: 0.0.0.0:10256
    hostnameOverride: ""
    iptables:
      masqueradeAll: false
      masqueradeBit: 14
      minSyncPeriod: 0s
      syncPeriod: 30s
    ipvs:
      minSyncPeriod: 0s
      scheduler: ""
      syncPeriod: 30s
    kind: KubeProxyConfiguration
    metricsBindAddress: 127.0.0.1:10249
    mode: ""
    nodePortAddresses: null
    oomScoreAdj: -999
    portRange: ""
    resourceContainer: /kube-proxy
    udpIdleTimeout: 250ms
  kubeconfig.conf: |-
    apiVersion: v1
    kind: Config
    clusters:
    - cluster:
        certificate-authority: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        server: https://192.168.56.10:6443
      name: default
    contexts:
    - context:
        cluster: default
        namespace: default
        user: default
      name: default
    current-context: default
    users:
    - name: default
      user:
        tokenFile: /var/run/secrets/kubernetes.io/serviceaccount/token
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  labels:
    k8s-app: kube-proxy
  name: kube-proxy
  namespace: kube-system
spec:
  selector:
    matchLabels:
      k8s-app: kube-proxy
  template:
    metadata:
      labels:
        k8s-app: kube-proxy
    spec:
      tolerations:
      - effect: NoSchedule
        key: node-role.kubernetes.io/master
      - effect: NoSchedule
        key: node.cloudprovider.kubernetes.io/uninitialized
        value: "true"
      hostNetwork: true
      restartPolicy: Always
      serviceAccount: kube-proxy
      serviceAccountName: kube-proxy
      containers:
      - name: kube-proxy
        image: k8s.gcr.io/kube-proxy-amd64:v1.10.3
        command:
        - /usr/local/bin/kube-proxy
        - --config=/var/lib/kube-proxy/config.conf
        imagePullPolicy: IfNotPresent
        securityContext:
          privileged: true
        volumeMounts:
        - mountPath: /var/lib/kube-proxy
          name: kube-proxy
        - mountPath: /run/xtables.lock
          name: xtables-lock
        - mountPath: /lib/modules
          name: lib-modules
          readOnly: true
      volumes:
      - configMap:
          defaultMode: 420
          name: kube-proxy
        name: kube-proxy
      - hostPath:
          path: /run/xtables.lock
          type: FileOrCreate
        name: xtables-lock
      - hostPath:
          path: /lib/modules
        name: lib-modules
EOF
```

安装插件：

```bash
$ kubectl create -f /etc/kubernetes/addon/kube-proxy.yml
serviceaccount "kube-proxy" created
clusterrolebinding.rbac.authorization.k8s.io "system:kube-proxy" created
configmap "kube-proxy" created
daemonset.apps "kube-proxy" created

$ kubectl -n kube-system get po -o wide -l k8s-app=kube-proxy
kube-proxy-42f4m   1/1       Running   0          47s       192.168.56.15   kube-n2
kube-proxy-5zn95   1/1       Running   0          48s       192.168.56.14   kube-n1
kube-proxy-7mwrf   1/1       Running   0          48s       192.168.56.11   kube-m1
kube-proxy-bs5p2   1/1       Running   0          47s       192.168.56.16   kube-n3
kube-proxy-qzsrx   1/1       Running   0          47s       192.168.56.13   kube-m3
kube-proxy-sgxvh   1/1       Running   0          47s       192.168.56.12   kube-m2
```

#### Kubernetes DNS

Kubernetes DNS 是 Kubernetes 集群内部 Pod 之间互相沟通的重要插件，它允许 Pod 可以通过 Domain Name 方式来连接 Service，其主要由 Kube DNS 与 Sky DNS 组合而成，通过 Kube DNS 监听 Service 与 Endpoint 变化，来提供给 Sky DNS 信息，已更新解析位址。


在 kube-m1 配置 kube-dns.yml 来安装 Kubernetes DNS 插件：

```bash
$ cd /etc/kubernetes/addon
$ cat > /etc/kubernetes/addon/kube-dns.yml <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kube-dns
  labels:
    k8s-app: kube-dns
    kubernetes.io/cluster-service: "true"
    addonmanager.kubernetes.io/mode: Reconcile
  namespace: kube-system
---
apiVersion: v1
kind: Service
metadata:
  name: kube-dns
  namespace: kube-system
  labels:
    k8s-app: kube-dns
    kubernetes.io/cluster-service: "true"
    addonmanager.kubernetes.io/mode: Reconcile
spec:
  selector:
    k8s-app: kube-dns
  clusterIP: 10.254.0.2
  ports:
  - name: dns
    port: 53
    protocol: UDP
  - name: dns-tcp
    port: 53
    protocol: TCP
---
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: kube-dns
  namespace: kube-system
  labels:
    k8s-app: kube-dns
    kubernetes.io/cluster-service: "true"
    addonmanager.kubernetes.io/mode: Reconcile
spec:
  selector:
    matchLabels:
      k8s-app: kube-dns
  template:
    metadata:
      labels:
        k8s-app: kube-dns
      annotations:
        scheduler.alpha.kubernetes.io/critical-pod: ''
    spec:
      dnsPolicy: Default
      serviceAccountName: kube-dns
      tolerations:
      - key: "CriticalAddonsOnly"
        operator: "Exists"
      - key: node-role.kubernetes.io/master
        effect: NoSchedule
      volumes:
      - name: kube-dns-config
        configMap:
          name: kube-dns
          optional: true
      containers:
      - name: kubedns
        image: gcr.io/google_containers/k8s-dns-kube-dns-amd64:1.14.7
        resources:
          limits:
            memory: 170Mi
          requests:
            cpu: 100m
            memory: 70Mi
        livenessProbe:
          httpGet:
            path: /healthcheck/kubedns
            port: 10054
            scheme: HTTP
          initialDelaySeconds: 60
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 5
        readinessProbe:
          httpGet:
            path: /readiness
            port: 8081
            scheme: HTTP
          initialDelaySeconds: 3
          timeoutSeconds: 5
        args:
        - "--domain=cluster.local"
        - --dns-port=10053
        - --v=2
        env:
        - name: PROMETHEUS_PORT
          value: "10055"
        ports:
        - containerPort: 10053
          name: dns-local
          protocol: UDP
        - containerPort: 10053
          name: dns-tcp-local
          protocol: TCP
        - containerPort: 10055
          name: metrics
          protocol: TCP
        volumeMounts:
        - name: kube-dns-config
          mountPath: /kube-dns-config
      - name: dnsmasq
        image: gcr.io/google_containers/k8s-dns-dnsmasq-nanny-amd64:1.14.7
        livenessProbe:
          httpGet:
            path: /healthcheck/dnsmasq
            port: 10054
            scheme: HTTP
          initialDelaySeconds: 60
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 5
        args:
        - "-v=2"
        - "-logtostderr"
        - "-configDir=/etc/k8s/dns/dnsmasq-nanny"
        - "-restartDnsmasq=true"
        - "--"
        - "-k"
        - "--cache-size=1000"
        - "--log-facility=-"
        - "--server=/cluster.local/127.0.0.1#10053"
        - "--server=/in-addr.arpa/127.0.0.1#10053"
        - "--server=/ip6.arpa/127.0.0.1#10053"
        ports:
        - containerPort: 53
          name: dns
          protocol: UDP
        - containerPort: 53
          name: dns-tcp
          protocol: TCP
        resources:
          requests:
            cpu: 150m
            memory: 20Mi
        volumeMounts:
        - name: kube-dns-config
          mountPath: /etc/k8s/dns/dnsmasq-nanny
      - name: sidecar
        image: gcr.io/google_containers/k8s-dns-sidecar-amd64:1.14.7
        livenessProbe:
          httpGet:
            path: /metrics
            port: 10054
            scheme: HTTP
          initialDelaySeconds: 60
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 5
        args:
        - "--v=2"
        - "--logtostderr"
        - "--probe=kubedns,127.0.0.1:10053,kubernetes.default.svc.cluster.local,5,A"
        - "--probe=dnsmasq,127.0.0.1:53,kubernetes.default.svc.cluster.local,5,A"
        ports:
        - containerPort: 10054
          name: metrics
          protocol: TCP
        resources:
          requests:
            memory: 20Mi
            cpu: 10m
EOF
```

- 其中 `10.254.0.2` 为 kubelet.service 中配置的 `--cluster-dns`。

安装插件：

```bash
$ kubectl create -f /etc/kubernetes/addon/kube-dns.yml
serviceaccount "kube-dns" created
service "kube-dns" created
deployment.extensions "kube-dns" created

$ kubectl -n kube-system get po -l k8s-app=kube-dns
NAME                        READY     STATUS    RESTARTS   AGE
kube-dns-654684d656-vzkjk   0/3       Pending   0          19s
```

这边会发现处于 `Pending` 状态，这是由于 Kubernetes Pod Network 还未建立完成，因此所有节点会处于 NotReady 状态，而造成 Pod 无法被排程分配到指定节点上启动，下面安装 Pod Network。

#### Calico Network 安装与设定

Calico 是一款纯 Layer 3 的资料中心网络方案(不需要 Overlay 网络)，Calico 好处是它整合了各种云原生平台，且 Calico 在每一个节点利用 Linux Kernel 实现高效的 vRouter 来负责资料的转发，而当资料中心复杂度增加时，可以用 BGP route reflector 来达成。

本次不采用手动方式来建立 Calico 网络，若想了解可以参考 [Integration Guide](https://docs.projectcalico.org/v3.0/getting-started/kubernetes/installation/integration)。

在 kube-m1 配置 calico.yaml 来安装 Calico Network：

```bash
$ mkdir /etc/kubernetes/network && cd /etc/kubernetes/network
$ cat > /etc/kubernetes/network/calico.yml <<EOF
kind: ConfigMap
apiVersion: v1
metadata:
  name: calico-config
  namespace: kube-system
data:
  etcd_endpoints: "https://192.168.56.11:2379,https://192.168.56.12:2379,https://192.168.56.13:2379"
  calico_backend: "bird"
  cni_network_config: |-
    {
      "name": "k8s-pod-network",
      "cniVersion": "0.3.0",
      "plugins": [
        {
          "type": "calico",
          "etcd_endpoints": "__ETCD_ENDPOINTS__",
          "etcd_ca_cert_file": "/etc/kubernetes/ssl/ca.pem",
          "etcd_cert_file": "/etc/etcd/ssl/etcd.pem",
          "etcd_key_file": "/etc/etcd/ssl/etcd-key.pem",
          "log_level": "info",
          "mtu": 1500,
          "ipam": {
              "type": "calico-ipam"
          },
          "policy": {
              "type": "k8s",
               "k8s_api_root": "https://__KUBERNETES_SERVICE_HOST__:__KUBERNETES_SERVICE_PORT__",
               "k8s_auth_token": "__SERVICEACCOUNT_TOKEN__"
          },
          "kubernetes": {
              "kubeconfig": "/etc/cni/net.d/__KUBECONFIG_FILENAME__"
          }
        },
        {
          "type": "portmap",
          "snat": true,
          "capabilities": {"portMappings": true}
        }
      ]
    }
---
kind: DaemonSet
apiVersion: extensions/v1beta1
metadata:
  name: calico-node
  namespace: kube-system
  labels:
    k8s-app: calico-node
spec:
  selector:
    matchLabels:
      k8s-app: calico-node
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
  template:
    metadata:
      labels:
        k8s-app: calico-node
      annotations:
        scheduler.alpha.kubernetes.io/critical-pod: ''
    spec:
      hostNetwork: true
      tolerations:
      - key: node.cloudprovider.kubernetes.io/uninitialized
        value: "true"
        effect: NoSchedule
      - key: node-role.kubernetes.io/master
        effect: NoSchedule
      - key: CriticalAddonsOnly
        operator: Exists
      serviceAccountName: calico-cni-plugin
      terminationGracePeriodSeconds: 0
      containers:
        - name: calico-node
          image: quay.io/calico/node:v3.0.4
          env:
            - name: CLUSTER_TYPE
              value: "k8s,bgp"
            - name: ETCD_ENDPOINTS
              valueFrom:
                configMapKeyRef:
                  name: calico-config
                  key: etcd_endpoints
            - name: CALICO_NETWORKING_BACKEND
              valueFrom:
                configMapKeyRef:
                  name: calico-config
                  key: calico_backend
            - name: CALICO_DISABLE_FILE_LOGGING
              value: "true"
            - name: CALICO_K8S_NODE_REF
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
            - name: FELIX_DEFAULTENDPOINTTOHOSTACTION
              value: "ACCEPT"
            - name: CALICO_IPV4POOL_CIDR
              value: "10.244.0.0/16"
            - name: CALICO_IPV4POOL_IPIP
              value: "Always"
            - name: FELIX_IPV6SUPPORT
              value: "false"
            - name: FELIX_IPINIPMTU
              value: "1440"
            - name: FELIX_LOGSEVERITYSCREEN
              value: "info"
            - name: IP
              value: "autodetect"
            - name: FELIX_HEALTHENABLED
              value: "true"
            - name: IP_AUTODETECTION_METHOD
              value: "interface=eth1"
            - name: IP6_AUTODETECTION_METHOD
              value: "interface=eth1"
            - name: ETCD_CA_CERT_FILE
              value: "/etc/kubernetes/ssl/ca.pem"
            - name: ETCD_CERT_FILE
              value: "/etc/etcd/ssl/etcd.pem"
            - name: ETCD_KEY_FILE
              value: "/etc/etcd/ssl/etcd-key.pem"
          securityContext:
            privileged: true
          resources:
            requests:
              cpu: 250m
          livenessProbe:
            httpGet:
              path: /liveness
              port: 9099
            periodSeconds: 10
            initialDelaySeconds: 10
            failureThreshold: 6
          readinessProbe:
            httpGet:
              path: /readiness
              port: 9099
            periodSeconds: 10
          volumeMounts:
            - mountPath: /lib/modules
              name: lib-modules
              readOnly: true
            - mountPath: /var/run/calico
              name: var-run-calico
              readOnly: false
            - mountPath: /etc/etcd/ssl
              name: etcd-ca-certs
            - mountPath: /etc/kubernetes/ssl
              name: kubernetes-ca-certs
              readOnly: true
        - name: install-cni
          image: quay.io/calico/cni:v2.0.3
          command: ["/install-cni.sh"]
          env:
            - name: CNI_CONF_NAME
              value: "10-calico.conflist"
            - name: ETCD_ENDPOINTS
              valueFrom:
                configMapKeyRef:
                  name: calico-config
                  key: etcd_endpoints
            - name: CNI_NETWORK_CONFIG
              valueFrom:
                configMapKeyRef:
                  name: calico-config
                  key: cni_network_config
          volumeMounts:
            - mountPath: /host/opt/cni/bin
              name: cni-bin-dir
            - mountPath: /host/etc/cni/net.d
              name: cni-net-dir
      volumes:
        - name: etcd-ca-certs
          hostPath:
            path: /etc/etcd/ssl
            type: DirectoryOrCreate
        - name: kubernetes-ca-certs
          hostPath:
            path: /etc/kubernetes/ssl
            type: DirectoryOrCreate
        - name: lib-modules
          hostPath:
            path: /lib/modules
        - name: var-run-calico
          hostPath:
            path: /var/run/calico
        - name: cni-bin-dir
          hostPath:
            path: /opt/cni/bin
        - name: cni-net-dir
          hostPath:
            path: /etc/cni/net.d
---
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: calico-kube-controllers
  namespace: kube-system
  labels:
    k8s-app: calico-kube-controllers
spec:
  replicas: 1
  strategy:
    type: Recreate
  template:
    metadata:
      name: calico-kube-controllers
      namespace: kube-system
      labels:
        k8s-app: calico-kube-controllers
      annotations:
        scheduler.alpha.kubernetes.io/critical-pod: ''
    spec:
      hostNetwork: true
      tolerations:
      - key: node.cloudprovider.kubernetes.io/uninitialized
        value: "true"
        effect: NoSchedule
      - key: node-role.kubernetes.io/master
        effect: NoSchedule
      - key: CriticalAddonsOnly
        operator: Exists
      serviceAccountName: calico-kube-controllers
      containers:
        - name: calico-kube-controllers
          image: quay.io/calico/kube-controllers:v2.0.2
          env:
            - name: ETCD_ENDPOINTS
              valueFrom:
                configMapKeyRef:
                  name: calico-config
                  key: etcd_endpoints
            - name: ENABLED_CONTROLLERS
              value: policy,profile,workloadendpoint,node
            - name: ETCD_CA_CERT_FILE
              value: "/etc/kubernetes/ssl/ca.pem"
            - name: ETCD_CERT_FILE
              value: "/etc/etcd/ssl/etcd.pem"
            - name: ETCD_KEY_FILE
              value: "/etc/etcd/ssl/etcd-key.pem"
          volumeMounts:
            - mountPath: /etc/etcd/ssl
              name: etcd-ca-certs
              readOnly: true
            - mountPath: /etc/kubernetes/ssl
              name: kubernetes-ca-certs
              readOnly: true
      volumes:
        - name: etcd-ca-certs
          hostPath:
            path: /etc/etcd/ssl
            type: DirectoryOrCreate
        - name: kubernetes-ca-certs
          hostPath:
            path: /etc/kubernetes/ssl
            type: DirectoryOrCreate

---
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: ClusterRoleBinding
metadata:
  name: calico-cni-plugin
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: calico-cni-plugin
subjects:
- kind: ServiceAccount
  name: calico-cni-plugin
  namespace: kube-system
---
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1beta1
metadata:
  name: calico-cni-plugin
rules:
  - apiGroups: [""]
    resources:
      - pods
      - nodes
    verbs:
      - get
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: calico-cni-plugin
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: ClusterRoleBinding
metadata:
  name: calico-kube-controllers
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: calico-kube-controllers
subjects:
- kind: ServiceAccount
  name: calico-kube-controllers
  namespace: kube-system
---
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1beta1
metadata:
  name: calico-kube-controllers
rules:
  - apiGroups:
    - ""
    - extensions
    resources:
      - pods
      - namespaces
      - networkpolicies
      - nodes
    verbs:
      - watch
      - list
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: calico-kube-controllers
  namespace: kube-system
EOF
```

安装插件：

```bash
$ kubectl create -f /etc/kubernetes/network/calico.yml
configmap "calico-config" created
daemonset.extensions "calico-node" created
deployment.extensions "calico-kube-controllers" created
clusterrolebinding.rbac.authorization.k8s.io "calico-cni-plugin" created
clusterrole.rbac.authorization.k8s.io "calico-cni-plugin" created
serviceaccount "calico-cni-plugin" created
clusterrolebinding.rbac.authorization.k8s.io "calico-kube-controllers" created
clusterrole.rbac.authorization.k8s.io "calico-kube-controllers" created
serviceaccount "calico-kube-controllers" created

$ kubectl -n kube-system get po -l k8s-app=calico-node -o wide
NAME                READY     STATUS    RESTARTS   AGE       IP              NODE
calico-node-hjghp   2/2       Running   0          9m        192.168.56.16   kube-n3
calico-node-jl9w2   2/2       Running   0          9m        192.168.56.12   kube-m2
calico-node-k4lkr   2/2       Running   0          9m        192.168.56.14   kube-n1
calico-node-kj9xd   2/2       Running   0          9m        192.168.56.15   kube-n2
calico-node-mf2xv   2/2       Running   0          9m        192.168.56.11   kube-m1
calico-node-p8pqq   2/2       Running   0          9m        192.168.56.13   kube-m3
```

查看刚刚 DNS 处于 Pending 的 Pod 是否已经启动：

```bash
$ kubectl -n kube-system get po -l k8s-app=kube-dns
NAME                        READY     STATUS    RESTARTS   AGE
kube-dns-654684d656-vzkjk   3/3       Running   0          25m
```

在 kube-m1 下载 Calico CLI 来查看 Calico nodes:

```bash
$ wget https://github.com/projectcalico/calicoctl/releases/download/v3.1.0/calicoctl -O /usr/local/bin/calicoctl

$ chmod u+x /usr/local/bin/calicoctl

$ cat <<EOF > ~/calico-rc
export ETCD_ENDPOINTS="https://192.168.56.11:2379,https://192.168.56.12:2379,https://192.168.56.13:2379"
export ETCD_CA_CERT_FILE="/etc/kubernetes/ssl/ca.pem"
export ETCD_CERT_FILE="/etc/etcd/ssl/etcd.pem"
export ETCD_KEY_FILE="/etc/etcd/ssl/etcd-key.pem"
EOF

$ calicoctl node status
Calico process is running.

IPv4 BGP status
+---------------+-------------------+-------+----------+-------------+
| PEER ADDRESS  |     PEER TYPE     | STATE |  SINCE   |    INFO     |
+---------------+-------------------+-------+----------+-------------+
| 192.168.56.12 | node-to-node mesh | up    | 06:59:37 | Established |
| 192.168.56.13 | node-to-node mesh | up    | 06:59:38 | Established |
| 192.168.56.14 | node-to-node mesh | up    | 07:04:57 | Established |
| 192.168.56.15 | node-to-node mesh | up    | 07:06:35 | Established |
| 192.168.56.16 | node-to-node mesh | up    | 07:07:06 | Established |
+---------------+-------------------+-------+----------+-------------+

IPv6 BGP status
No IPv6 peers found.
```