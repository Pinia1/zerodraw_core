#!/bin/bash

# 数据库导出脚本
# 使用方法: ./export.sh [模式]
# 模式: full (默认), schema, data, all

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

# 导出模式
MODE=${1:-full}

# 创建备份目录
BACKUP_DIR="../backups"
mkdir -p "$BACKUP_DIR"

# 生成文件名（带时间戳）
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="${DB_NAME}_${MODE}_${TIMESTAMP}.sql"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

echo "📦 开始导出数据库..."
echo "模式: $MODE"
echo "文件: $FILEPATH"

# 根据模式执行不同的导出命令
case $MODE in
  schema)
    # 只导出表结构
    mysqldump -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" \
      --no-data \
      --routines \
      --triggers \
      "$DB_NAME" > "$FILEPATH"
    ;;
  
  data)
    # 只导出数据
    mysqldump -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" \
      --no-create-info \
      --skip-triggers \
      "$DB_NAME" > "$FILEPATH"
    ;;
  
  all)
    # 导出所有（包括存储过程、触发器等）
    mysqldump -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" \
      --all-databases \
      --routines \
      --triggers \
      --events \
      "$DB_NAME" > "$FILEPATH"
    ;;
  
  full|*)
    # 完整导出（默认）
    mysqldump -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" \
      --routines \
      --triggers \
      "$DB_NAME" > "$FILEPATH"
    ;;
esac

# 检查导出是否成功
if [ $? -eq 0 ]; then
  echo "✅ 导出成功: $FILEPATH"
  
  # 压缩备份文件
  gzip "$FILEPATH"
  echo "✅ 已压缩: ${FILEPATH}.gz"
  
  # 显示文件大小
  FILE_SIZE=$(ls -lh "${FILEPATH}.gz" | awk '{print $5}')
  echo "📊 文件大小: $FILE_SIZE"
else
  echo "❌ 导出失败"
  exit 1
fi

echo "✨ 完成!"
