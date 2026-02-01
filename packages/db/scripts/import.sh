#!/bin/bash

# 数据库导入脚本
# 使用方法: ./import.sh [文件路径]

# 加载环境变量
if [ -f "../../.env" ]; then
  export $(cat ../../.env | grep -v '^#' | xargs)
fi

# 设置默认值
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD:-}
DB_NAME=${DB_NAME:-zerodraw}

# 备份目录
BACKUP_DIR="../backups"

# 获取文件路径
SQL_FILE=$1

# 如果没有指定文件，显示可用的备份文件
if [ -z "$SQL_FILE" ]; then
  echo "📋 可用的备份文件:"
  echo ""
  
  if [ -d "$BACKUP_DIR" ]; then
    ls -lht "$BACKUP_DIR"/*.sql* 2>/dev/null | head -10
  else
    echo "❌ 备份目录不存在: $BACKUP_DIR"
  fi
  
  echo ""
  echo "使用方法: ./import.sh <文件路径>"
  echo "示例: ./import.sh ../backups/zerodraw_full_20240101_120000.sql"
  exit 1
fi

# 检查文件是否存在
if [ ! -f "$SQL_FILE" ]; then
  echo "❌ 文件不存在: $SQL_FILE"
  exit 1
fi

# 检查文件扩展名
EXTENSION="${SQL_FILE##*.}"

echo "📦 开始导入数据库..."
echo "文件: $SQL_FILE"
echo "数据库: $DB_NAME"

# 确认操作
read -p "⚠️  警告: 此操作将覆盖现有数据。是否继续? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ 操作已取消"
  exit 1
fi

# 如果是 .gz 文件，先解压
if [ "$EXTENSION" = "gz" ]; then
  echo "📦 正在解压文件..."
  TEMP_FILE="${SQL_FILE%.gz}"
  gunzip -c "$SQL_FILE" > "$TEMP_FILE"
  SQL_FILE="$TEMP_FILE"
fi

# 执行导入
mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$SQL_FILE"

# 检查导入是否成功
if [ $? -eq 0 ]; then
  echo "✅ 导入成功"
  
  # 删除临时解压文件
  if [ "$EXTENSION" = "gz" ] && [ -f "$TEMP_FILE" ]; then
    rm "$TEMP_FILE"
    echo "🗑️  已删除临时文件"
  fi
else
  echo "❌ 导入失败"
  exit 1
fi

echo "✨ 完成!"
