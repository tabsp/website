---
title: Android Pie（Android 9）跳过 Google 框架 (GApps) 开机验证方法
date: 2019-03-02 17:03
tags: 
  - Android
---
如果刷机时刷入了 Google 框架（GApps）可以使用以下方法跳过验证：

1. 进入TWRP，并 mount system 分区，数据线链接电脑。
<!-- more -->
2. 打开 cmd 或其它终端：

``` shell
# 将 build.prop 拉取到当前目录
$ adb pull system/build.prop .

# 使用记事本或其他软件在 build.prop 文件最后加入以下代码
ro.setupwizard.mode=DISABLED

# 将 build.prop 文件放回 system
$ adb push ./build.prop system

# 进入手机内部 shell
$ adb shell

# 修改 build.prop 文件权限 (拷贝命令可能有问题，建议直接输入)
$ chmod 0644 system/build.prop

# 退出手机 shell
$ exit
```

最后拔下数据线重启手机就会跳过验证直接进入桌面了

（完）