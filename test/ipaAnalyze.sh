#!/bin/bash

# ipa路径
ipaFilePath=${1}

echo "iPA内容分析脚本开始"

# 1.获取 ipa大小 | 数值可能和Mac本地合计不一样 因为apple文件系统是4K对齐的
ipa_size=`du -h $ipaFilePath | awk '{print $1}'`


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
# if [ -d "$temIpaDirPath" ]; then
#     echo "删除临时解包目录 rm ${temIpaDirPath}"
#     rm -rf "${temIpaDirPath}"
# fi

# # 解包IPA
# if [[ -f "$ipaFilePath" ]]; then
#     echo "unzip $ipaFilePath begin ..."
#     unzip -q "$ipaFilePath"  -d "$temIpaDirPath"
#     echo "unzip $ipaFilePath end ..."
# fi 

# 3. 开始分析 POPO.app
app_path="${temIpaDirPath}/Payload/POPO.app"
echo "app文件路径: $app_path"
app_size=`du -sh $app_path | awk '{print $1}'`


# Frameworks，动态库存放路径；
# PlugIns，插件存放路径，如today extension；
# Mach-O,可执行文件； exec格式的xxx：   可执行包
# Assets.car，Asset Catalog编译产物；
# bundle，主要存放资源文件；
# _CodeSignature：ipa包签名文件
# 其它资源文件

# exec_path="${app_path}/POPO"
# assets_car='Assets.car'
# bundle_file='bundle$'
# frameworks_path='Frameworks'
# plugins_path='PlugIns'
# base_lproj_path='Base.lproj'
# zh_lproj_path='zh-Hans.lproj'
# ja_lproj_path='ja.lproj'
# en_lproj_path='en.lproj'

# exec_size_1=$(du -h $exec_path | awk '{print $1}')

cd "${app_path}/"
echo "当前路径:"`pwd`
# assets_size_1=$(ls -lh | grep ${assets_car} | awk '{print $5}')
# bundle_size_kb_1=$(du -ck | grep ${bundle_file} | awk '{sum+=$1} END {print sum}')
# bundle_size_mb_1=`expr ${bundle_size_kb_1} / 1024`
# bundle_num=$(ls | grep '.*bundle' | wc -l | awk '{print $1}')
# frameworks_size=$(du -sh ${frameworks_path} | awk '{print $1}')
# pligins_size==$(du -sh ${plugins_path} | awk '{print $1}')
# base_lproj_size==$(du -sh ${base_lproj_path} | awk '{print $1}')
# zh_lproj_size==$(du -sh ${zh_lproj_path} | awk '{print $1}')
# ja_lproj_size==$(du -sh ${ja_lproj_path} | awk '{print $1}')
# en_lproj_size==$(du -sh ${en_lproj_path} | awk '{print $1}')

# echo "-----------"
# echo "ipa大小:"$ipa_size
# echo "app大小:"$app_size
# echo "可执行文件大小:${exec_size_1}"
# echo "assets文件大小:${assets_size_1}"
# echo "所有bundle文件大小:${bundle_size_kb_1}kb :${bundle_size_mb_1}mb"
# echo "所有bundle文件数量:${bundle_num}"
# echo "Framework文件夹大小:${frameworks_size}"
# echo "PlugIns文件夹大小:${pligins_size}"
# echo "lprojs文件夹大小 base:${base_lproj_size} zh:${zh_lproj_size} ja:${ja_lproj_size} en:${en_lproj_size}"

funcaltypesize(){
  list=`find .  -type f -name "*.$1" -maxdepth 1`
  totalSize=0
  for i in $list
    do
    # echo "名字：$i"
    fileSize=$(du -k "${i}" | cut -f1)
    # echo "${i}:大小：${fileSize}"
    totalSize=${fileSize}+${totalSize}
  done
#   echo "$1文件总大小为：$((totalSize)) kb"
  return $((totalSize))
}

png_num=$(ls | grep '.*png' | wc -l | awk '{print $1}')
funcaltypesize 'png'
png_size=$?
echo "png 图片数量：${png_num}"
echo "png 图片size：${png_size}kb"

gif_num=$(ls | grep '.*gif' | wc -l | awk '{print $1}')
funcaltypesize 'gif'
gif_size=$?
echo "gif 图片数量：${gif_num}"
echo "gif 图片size：${gif_size}kb"

jpg_num=$(ls | grep '.*jpg' | wc -l | awk '{print $1}')
funcaltypesize 'jpg'
jpg_size=$?
echo "jpg 图片数量：${jpg_num}"
echo "jpg 图片size：${jpg_size}kb"

svg_num=$(ls | grep '.*svg' | wc -l | awk '{print $1}')
funcaltypesize 'svg'
svg_size=$?
echo "svg 图片数量：${svg_num}"
echo "svg 图片size：${svg_size}kb"