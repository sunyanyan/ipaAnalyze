#!/bin/bash

# ipa路径
ipaFilePath=${1}

echo "解压ipa文件脚本开始"

# 2.解压ipa文件

# 当前脚本的目录定义为基础目录
basePath=$(dirname $0)
basePath=$(cd "$(dirname "$0")";pwd)
echo "基础目录地址 basePath : $basePath"


if [ ! -f "$ipaFilePath" ]; then
    echo "未找到ipa包 $ipaFilePath"
    exit 2
fi


# 当前ipa解压路径
temIpaDirName="TempPayload"
temIpaDirPath="${basePath}/${temIpaDirName}"
echo "当前ipa解压路径 temIpaDirPath : $temIpaDirPath"

# 删除临时解包目录
if [ -d "$temIpaDirPath" ]; then
    echo "删除临时解包目录 rm ${temIpaDirPath}"
    rm -rf "${temIpaDirPath}"
fi

# 解包IPA
if [[ -f "$ipaFilePath" ]]; then
    echo "unzip $ipaFilePath begin ..."
    unzip -q "$ipaFilePath"  -d "$temIpaDirPath"
    echo "unzip $ipaFilePath end ..."
fi 