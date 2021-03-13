---
title: Arch Linux 安装
date: 2021-03-13 09:46
tags: 
  - Linux
  - Arch
---
## 下载镜像

在 [Arch Linux - Downloads](https://archlinux.org/download/) 页面任意找一个镜像站下载，国内推荐使用[清华大学开源软件镜像站](https://mirrors.tuna.tsinghua.edu.cn/archlinux/iso/latest/)。

## 安装系统

### 系统刻录

推荐使用 [balenaEtcher](https://www.balena.io/etcher/)，虚拟机安装则直接选择下载后的镜像即可。

### 准备操作

确保已经连接到网络，直接连接有线网络或通过 [iwctl](https://wiki.archlinux.org/index.php/Iwd_(简体中文)#iwctl) 连接无线网络

```bash
# 同步系统时间
timedatectl set-ntp true
```

### 磁盘分区

使用上一步创建启动盘启动系统，启动后会进入一个命令提示符界面，接着开始对磁盘进行分区操作。

**注意：此步骤分区基于 GPT 分区表**

```bash
# 查看磁盘列表，确认要分区的磁盘编号
fdisk -l

# 确认编号后开始进行分区，我这里是磁盘编号为 sda（依据实际情况修改）
fdisk /dev/sda
# 接着按序号进行操作
1. p # 显示分区信息
2. g # 创建 GPT 分区表
3. p # 再次查看分区信息

4. n # 开始创建引导分区
5. <CR> # 回车，分区编号默认
6. <CR> # 回车，起始柱面默认
7. +512M # 启动分区分配 512M

8. n # 开始创建 swap 分区
9. 3 # 分区编号设置为 3
10. <CR> # 回车，起始柱面默认
11. +4G # 交换分区分配 4G（一般为内存大小的 2 倍）

12. n # 开始创建数据分区
13. <CR> # 回车，分区编号默认
14. <CR> # 回车，起始柱面默认
15. <CR> # 回车，剩余空间全部分配给数据分区

16. p # 查看分区信息
17. w # 保存分区信息
```

### 格式化分区

```bash
# 查看磁盘列表，确认要格式化的分区编号
fdisk -l

# 格式化引导分区，我这里编号为 sda1（依据实际情况修改）
mkfs.fat -F32 /dev/sda1
# 格式化数据分区
mkfs.ext4 /dev/sda2
# 设置并开启 swap 分区
mkswap /dev/sda3
swapon /dev/sda3
```

### 挂载分区

```bash
# 将数据分区挂载到 /mnt
mount /dev/sda2 /mnt
# 创建引导分区挂载点并挂载
mkdir /mnt/boot
mount /dev/sda1 /mnt/boot
```

### 开始安装

```bash
# 安装必须的软件、Linux 内核及硬件驱动
pacstrap /mnt base linux linux-firmware

# 生成 fstab
genfstab -U /mnt >> /mnt/etc/fstab
# 检查生成后的 fstab 文件
cat /mnt/etc/fstab

# 进入到新安装的系统
arch-chroot /mnt
# 配置时区（依据实际情况修改）
ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
# 同步系统时间
hwclock --systohc
# 检查时间
date
# 退回到安装引导系统
exit

# 配置编码
# 编辑文件打开这两行注释
vim /mnt/etc/locale.gen
en_US.UTF-8 UTF-8
zh_CN.UTF-8 UTF-8
# 新建文件新增一行
vim /mnt/etc/locale.conf
LANG=en_US.UTF-8

# 配置主机名（依据实际情况修改）
echo myhostname > /mnt/etc/hostname

# 重新进入到新安装的系统
arch-chroot /mnt
# 生成编码
locale-gen
# 设置 root 密码
passwd
# 安装引导
pacman -S grub efibootmgr intel-ucode os-prober
# 生成 grub 配置
mkdir /boot/grub
grub-mkconfig > /boot/grub/grub.cfg
# 确认电脑类型，我这里是 x86_64
uname -m
x86_64

# 根据上一步确认的电脑类型安装 grub
grub-install --target=x86_64-efi --efi-directory=/boot

# 安装必要及常用的软件
pacman -S vim vi zsh dhcpcd

# 退回到安装引导系统
exit
# 重启
reboot
```

## 安装后的配置

重启后拔掉启动 U 盘或删除 arch 镜像盘片（虚拟机安装）。使用 root 用户登录，密码为在上一节中自行设置的密码。

### 网络设置

```bash
# 确认网卡编号
ip a

# 手动联网，我这里网卡编号为 enp0s3（依据实际情况修改）
ip link set enp0s3 up
dhcpcd &

# 设置开机自动联网（依据实际情况修改网卡编号）
systemctl enable dhcpcd@enp0s3
systemctl start dhcpcd@enp0s3
systemctl status dhcpcd@enp0s3

```

### 系统更新

```bash
# 更新最新系统
pacman -Syyu
# 安装必要软件
pacman -S base-devel
```

### 新建用户

```bash
# 新建 tom（依据实际情况修改）
useradd -m -G wheel tom
# 设置 tom 的密码（依据实际情况修改）
passwd tom

# 配置权限
visudo
# 82 行左右，取消注释
%wheel ALL=(ALL) ALL

# 退出 root 登陆 tom 或其它
exit
```