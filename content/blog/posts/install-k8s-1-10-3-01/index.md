---
title: 虚拟机部署 Kubernetes v1.10.3  高可用集群 - 01 虚拟机环境准备
date: 2018-05-30 17:42
tags: 
  - Jenkins
  - Java
  - Kubernetes
---
使用 Vagrant 管理虚拟机集群，下边是安装步骤。

### 文件准备

目录结构如下：

```bash
├── setup.sh
├── Vagrantfile
└── yum
    └── CentOS7-Base-163.repo
```

Vagrantfile：

```bash
def set_vbox(vb, config)
  vb.gui = false
  vb.memory = 1024
  vb.cpus = 1
end

Vagrant.configure("2") do |config|
  config.vm.box_check_update = false
  # 设置虚拟机的 Box
  config.vm.box = "centos/7"
  (1..6).each do |i|
    name = (i <= 3) ? "kube-m" : "kube-n"
    id = (i <= 3) ? i : i - 3
    config.vm.define "#{name}#{id}" do |n|
      n.vm.hostname = "#{name}#{id}"
      ip_addr = "192.168.56.#{i + 10}"
      n.vm.network :private_network, ip: "#{ip_addr}", auto_config: true
      n.vm.provider :virtualbox do |vb, override|
        vb.name = "#{n.vm.hostname}"
        set_vbox(vb, override)
      end
    end
  end
  # 使用shell脚本进行软件安装和配置
  config.vm.provision "shell", path: "./setup.sh"
end
```

setup.sh：

```bash
#!/bin/bash

# Copy hosts info
cat <<EOF > /etc/hosts
127.0.0.1	localhost
127.0.1.1	vagrant.vm	vagrant
192.168.56.11 kube-m1
192.168.56.12 kube-m2
192.168.56.13 kube-m3
192.168.56.14 kube-n1
192.168.56.15 kube-n2
192.168.56.16 kube-n3
# The following lines are desirable for IPv6 capable hosts
::1     localhost ip6-localhost ip6-loopback
ff02::1 ip6-allnodes
ff02::2 ip6-allrouters
EOF

# change time zone
cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
timedatectl set-timezone Asia/Shanghai
# set yum mirror
rm /etc/yum.repos.d/CentOS-Base.repo
cp /vagrant/yum/*.* /etc/yum.repos.d/
mv /etc/yum.repos.d/CentOS7-Base-163.repo /etc/yum.repos.d/CentOS-Base.repo
# install  kmod and ceph-common for rook
yum install -y wget curl conntrack-tools vim net-tools socat ntp kmod ceph-common
# install docker
groupadd docker
usermod -aG docker vagrant
rm -rf ~/.docker/
yum install -y docker.x86_64
cat > /etc/docker/daemon.json <<EOF
{
  "registry-mirrors" : ["https://k64bpq6l.mirror.aliyuncs.com"]
}
EOF

# Download kubelet and kubectl
KUBE_URL="https://storage.googleapis.com/kubernetes-release/release/v1.10.3/bin/linux/amd64"
wget "${KUBE_URL}/kubelet" -O /usr/local/bin/kubelet
chmod +x /usr/local/bin/kubelet

if [[ ${HOSTNAME} =~ m ]]; then
  wget "${KUBE_URL}/kubectl" -O /usr/local/bin/kubectl
  chmod +x /usr/local/bin/kubectl
fi

# Setup system vars
cat <<EOF > /etc/sysctl.d/k8s.conf
net.ipv4.ip_forward = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
EOF

sysctl -p /etc/sysctl.d/k8s.conf

swapoff -a && sysctl -w vm.swappiness=0
sed '/vagrant--vg-swap_1/d' -i  /etc/fstab
```

CentOS7-Base-163.repo ：

```bash
[base]
name=CentOS-$releasever - Base - 163.com
#mirrorlist=http://mirrorlist.centos.org/?release=$releasever&arch=$basearch&repo=os
baseurl=http://mirrors.163.com/centos/$releasever/os/$basearch/
gpgcheck=1
gpgkey=http://mirrors.163.com/centos/RPM-GPG-KEY-CentOS-7

#released updates
[updates]
name=CentOS-$releasever - Updates - 163.com
#mirrorlist=http://mirrorlist.centos.org/?release=$releasever&arch=$basearch&repo=updates
baseurl=http://mirrors.163.com/centos/$releasever/updates/$basearch/
gpgcheck=1
gpgkey=http://mirrors.163.com/centos/RPM-GPG-KEY-CentOS-7

#additional packages that may be useful
[extras]
name=CentOS-$releasever - Extras - 163.com
#mirrorlist=http://mirrorlist.centos.org/?release=$releasever&arch=$basearch&repo=extras
baseurl=http://mirrors.163.com/centos/$releasever/extras/$basearch/
gpgcheck=1
gpgkey=http://mirrors.163.com/centos/RPM-GPG-KEY-CentOS-7

#additional packages that extend functionality of existing packages
[centosplus]
name=CentOS-$releasever - Plus - 163.com
baseurl=http://mirrors.163.com/centos/$releasever/centosplus/$basearch/
gpgcheck=1
enabled=0
gpgkey=http://mirrors.163.com/centos/RPM-GPG-KEY-CentOS-7
```


### 启动集群

```bash
$ # 下载 CentOS7 box 镜像
$ wget -c http://cloud.centos.org/centos/7/vagrant/x86_64/images/CentOS-7-x86_64-Vagrant-1801_02.VirtualBox.box
$ vagrant box add CentOS-7-x86_64-Vagrant-1801_02.VirtualBox.box --name centos/7
$ # 启动集群
$ vagrant up
```

### 节点信息

| IP Address    | Hostname |
| ------------- | :------: |
| 192.168.56.11 | kube-m1  |
| 192.168.56.12 | kube-m2  |
| 192.168.56.13 | kube-m3  |
| 192.168.56.14 | kube-n1  |
| 192.168.56.15 | kube-n2  |
| 192.168.56.16 | kube-n3  |

- m 为 Master 节点，n 为 Node 节点。
- 主要操作将在 "kube-m1" 主机上进行，请事先配置好 m1 主机免密登录其他主机。
- 所有命名默认以 root 用户执行。
- 关闭所有节点的 SELinux 
    ```bash
    $ vim /etc/selinux/config
    SELINUX=disabled
    $ reboot
    ```
    注意：如果不关闭 SELinux k8s 挂载目录会报 `Permission denied` 错误。

### 准备工作

一些需要初始化的东西已经写在 setup.sh 中，具体如下：

- 设置 /etc/hosts 解析到集群所有主机。
- 所有节点设置时区、软件源等设置。
- 所有节点安装 Docker 并设置加速器。
- 所有节点安装 kubectl。

### 备注

*1. 由于资源限制，Etcd 部署在三台 k8s Master 节点上，宿主机资源充足的话可以部署在三台单独的主机上。*

*2. 免密登录只需要将宿主机公钥写入到 m1 主机的 `~/.ssh/authorized_keys` 文件中，然后在 m1 主机执行 `ssh-keygen` 生成密钥对，并将公钥依次写入到其他需要登录主机的 `~/.ssh/authorized_keys` 文件中。*

示例: 

```bash
# 宿主机执行
$ vagrant ssh kube-m2
# 进入 m2 主机后 su 到 root 用户，密码 vagrant
[vagrant@kube-n1 ~]$ su
Password:
# 将 m1 主机的公钥写入 m2 完成免密登录配置，依次配置其他主机
[root@kube-n1 vagrant]# mkdir ~/.ssh && echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDNEj6obDW/eERX04E22ucDGwUTQ6C8DSL1Dqun/7VuQJei6lzdWBBDKy6AJEPh/w51Po9vlqZCiso1+N/vwLzakSHqYh685L2tsXTpQza16N624sP7lt201TwUlKJ9tlQRzahtX833PCtvSSwv8T7EsZVwUN4zz7eA+To+hPzzVEBlU/wMgoHMWlGLG/dNGqUl3mJeBFJ7NRbC1ePzZYXUxhyFY9N36GcOoI+cJXroApecKMK5fSZbXyYDFRZ8Mf7EMkRQkXx5BasGRTAzKBkJ1OW2JBP17VdJqmJKOBHDnetwyH0zcS5C6/vWgiJspiJJu9Cw2I5/aZ6uij3g0tW9 root@kube-m1" >> ~/.ssh/authorized_keys
```

*3. SELinux 需要手动关闭。*

*4. 关于镜像被墙的问题参考 『虚拟机部署 Kubernetes v1.10.3 高可用集群 - 05 总结』 中的描述。*