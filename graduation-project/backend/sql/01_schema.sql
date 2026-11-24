-- =============================================================================
-- 城市交通运行监测大屏 —— 数据库结构（C-DB-SCHEMA@1）
--
-- 说明：
--   * 目标库：MySQL 8.0（本机 8.0.33），库名由 DB_NAME 决定（默认 traffic_screen）；
--     本文件不包含 CREATE DATABASE / USE，由 scripts/init-db.mjs 建库后执行；
--   * 全部使用 CREATE TABLE IF NOT EXISTS，可重复执行，不会破坏既有数据；
--   * 统一 InnoDB + utf8mb4 + utf8mb4_0900_ai_ci；
--   * 时间口径：DATETIME(3) 为毫秒精度，字符串按 Asia/Shanghai 写入；
--     面向大屏的毫秒时间戳由 traffic_region_snapshot.sim_time_ms 承载。
--   * 本文件仅含结构，不含任何数据（种子见 02_seed.sql）。
-- =============================================================================

-- 1. 管理员账号 --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admin_user` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `username`        VARCHAR(64)     NOT NULL                COMMENT '登录名',
  `password_hash`   VARCHAR(100)    NOT NULL                COMMENT 'bcrypt 口令哈希（cost=10）',
  `display_name`    VARCHAR(64)     NOT NULL                COMMENT '显示名称',
  `role`            VARCHAR(16)     NOT NULL DEFAULT 'admin' COMMENT '角色，当前仅 admin',
  `status`          TINYINT         NOT NULL DEFAULT 1      COMMENT '1=启用 0=停用',
  `token_version`   INT             NOT NULL DEFAULT 1      COMMENT '令牌版本，+1 可使已签发访问令牌立即失效',
  `failed_attempts` INT             NOT NULL DEFAULT 0      COMMENT '连续登录失败次数',
  `locked_until`    DATETIME        NULL                    COMMENT '锁定截止时间，NULL 表示未锁定',
  `last_login_at`   DATETIME(3)     NULL                    COMMENT '最近登录时间',
  `created_at`      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='管理员账号';

-- 2. 刷新令牌（只存 sha256 哈希，轮换时置 revoked_at） ------------------------
CREATE TABLE IF NOT EXISTS `admin_refresh_token` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_id`    BIGINT UNSIGNED NOT NULL                COMMENT 'admin_user.id',
  `token_hash` CHAR(64)        NOT NULL                COMMENT 'sha256(refreshToken) 十六进制',
  `issued_at`  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '签发时间',
  `expires_at` DATETIME(3)     NOT NULL                COMMENT '过期时间',
  `revoked_at` DATETIME(3)     NULL                    COMMENT '吊销时间，NULL 表示有效',
  `user_agent` VARCHAR(200)    NULL                    COMMENT '签发时客户端 UA（截断存储）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_token` (`token_hash`),
  KEY `idx_user` (`user_id`, `revoked_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='管理员刷新令牌';

-- 3. 路网区域（全国 / 省 / 市） -----------------------------------------------
CREATE TABLE IF NOT EXISTS `traffic_region` (
  `region_code`  INT UNSIGNED NOT NULL                COMMENT '行政区划 adcode（全国固定 100000）',
  `region_name`  VARCHAR(64)  NOT NULL                COMMENT '区域名称，须与 geoJSON name 一致',
  `level`        ENUM('country','province','city') NOT NULL COMMENT '层级',
  `province_code` INT UNSIGNED NOT NULL DEFAULT 100000 COMMENT '所属省 adcode（省级与全国为 100000）',
  `centroid_lng` DECIMAL(10,6) NOT NULL               COMMENT '质心经度',
  `centroid_lat` DECIMAL(10,6) NOT NULL               COMMENT '质心纬度',
  `enabled`      TINYINT(1)    NOT NULL DEFAULT 1     COMMENT '1=启用 0=停用',
  `deleted_at`   DATETIME(3)   NULL                   COMMENT '逻辑删除时间',
  `created_at`   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`region_code`),
  KEY `idx_level` (`level`, `enabled`),
  KEY `idx_province` (`province_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='路网区域';

-- 4. 路口 --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `traffic_intersection` (
  `intersection_id`   VARCHAR(24)   NOT NULL                COMMENT '路口编号，规则 IN-<cityCode>-<3 位序号>',
  `intersection_name` VARCHAR(64)   NOT NULL                COMMENT '路口名称（词根 + 后缀，允许重名）',
  `city_code`         INT UNSIGNED  NOT NULL                COMMENT '所属市 adcode（非内置省省会为省级 adcode）',
  `road_weight`       DECIMAL(4,2)  NOT NULL DEFAULT 1.00   COMMENT '道路权重 [0.1, 3.0]，影响流量基线',
  `lng`               DECIMAL(10,6) NOT NULL                COMMENT '经度',
  `lat`               DECIMAL(10,6) NOT NULL                COMMENT '纬度',
  `enabled`           TINYINT(1)    NOT NULL DEFAULT 1      COMMENT '1=启用 0=停用',
  `deleted_at`        DATETIME(3)   NULL                    COMMENT '逻辑删除时间',
  `created_at`        DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`        DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`intersection_id`),
  KEY `idx_city` (`city_code`, `enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='路口';

-- 5. 区域快照（5 分钟粒度，保留 7 天） ---------------------------------------
CREATE TABLE IF NOT EXISTS `traffic_region_snapshot` (
  `id`                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `region_code`          INT UNSIGNED    NOT NULL                COMMENT '区域 adcode',
  `stat_time`            DATETIME        NOT NULL                COMMENT '统计时间，按 5 分钟对齐',
  `sim_time_ms`          BIGINT          NOT NULL                COMMENT '对应模拟时间（epoch ms）',
  `congestion_index`     DECIMAL(4,2)    NOT NULL                COMMENT '拥堵指数 [0,10]',
  `active_vehicles`      INT             NOT NULL                COMMENT '活跃车辆数',
  `accident_count_today` INT             NOT NULL                COMMENT '当日事故累计',
  `avg_speed`            DECIMAL(4,1)    NOT NULL                COMMENT '平均速度 km/h',
  `active_car`           INT             NOT NULL                COMMENT '小汽车活跃数',
  `active_bus`           INT             NOT NULL                COMMENT '公交车活跃数',
  `active_truck`         INT             NOT NULL                COMMENT '货车活跃数',
  `active_ev`            INT             NOT NULL                COMMENT '电动车活跃数',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_region_time` (`region_code`, `stat_time`),
  KEY `idx_time` (`stat_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='区域快照（5 分钟）';

-- 6. 路口快照（30 分钟粒度，保留 3 天） --------------------------------------
CREATE TABLE IF NOT EXISTS `traffic_intersection_snapshot` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `intersection_id` VARCHAR(24)     NOT NULL                COMMENT '路口编号',
  `stat_time`       DATETIME        NOT NULL                COMMENT '统计时间，按 30 分钟对齐',
  `flow_per_hour`   INT             NOT NULL                COMMENT '小时流量（辆/时）',
  `congestion_level` DECIMAL(4,2)   NOT NULL                COMMENT '拥堵程度 [0,10]',
  `flow_car`        INT             NOT NULL                COMMENT '小汽车流量',
  `flow_bus`        INT             NOT NULL                COMMENT '公交车流量',
  `flow_truck`      INT             NOT NULL                COMMENT '货车流量',
  `flow_ev`         INT             NOT NULL                COMMENT '电动车流量',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_intersection_time` (`intersection_id`, `stat_time`),
  KEY `idx_time` (`stat_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='路口快照（30 分钟）';

-- 7. 分时流量（按区域 + 日期 + 小时聚合，保留 90 天） ------------------------
CREATE TABLE IF NOT EXISTS `traffic_hour_flow` (
  `region_code`  INT UNSIGNED      NOT NULL                COMMENT '区域 adcode',
  `stat_date`    DATE              NOT NULL                COMMENT '日期（Asia/Shanghai）',
  `stat_hour`    TINYINT UNSIGNED  NOT NULL                COMMENT '小时 0..23',
  `flow_sum`     BIGINT            NOT NULL DEFAULT 0      COMMENT '样本流量累计',
  `sample_count` INT               NOT NULL DEFAULT 0      COMMENT '样本数，flow = flow_sum / sample_count',
  `updated_at`   DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`region_code`, `stat_date`, `stat_hour`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='分时流量';

-- 8. 事故记录（保留 90 天） --------------------------------------------------
CREATE TABLE IF NOT EXISTS `traffic_accident` (
  `accident_id`   VARCHAR(16)   NOT NULL                COMMENT '事故编号 AC-\\d{5}',
  `accident_type` VARCHAR(16)   NOT NULL                COMMENT 'rearEnd/scratch/rollover/pedestrian/other',
  `severity`      VARCHAR(8)    NOT NULL                COMMENT 'minor/moderate/severe',
  `region_code`   INT UNSIGNED  NOT NULL                COMMENT '所属省或市 adcode',
  `vehicle_type`  VARCHAR(8)    NOT NULL                COMMENT 'car/bus/truck/ev',
  `lng`           DECIMAL(10,6) NOT NULL                COMMENT '经度',
  `lat`           DECIMAL(10,6) NOT NULL                COMMENT '纬度',
  `occur_time`    DATETIME(3)   NOT NULL                COMMENT '发生时间',
  `status`        VARCHAR(12)   NOT NULL DEFAULT 'processing' COMMENT 'processing/closed',
  `closed_at`     DATETIME(3)   NULL                    COMMENT '关闭时间',
  `created_at`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`accident_id`),
  KEY `idx_status_occur` (`status`, `occur_time`),
  KEY `idx_region_occur` (`region_code`, `occur_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='交通事故';

-- 9. 采集任务状态（主键即任务名） --------------------------------------------
CREATE TABLE IF NOT EXISTS `traffic_collect_job` (
  `job_name`         VARCHAR(32) NOT NULL                COMMENT 'tick/region_snapshot/intersection_snapshot/hour_flow/retention',
  `interval_seconds` INT         NOT NULL                COMMENT '执行周期（秒）',
  `last_run_at`      DATETIME(3) NULL                    COMMENT '最近一次执行时间',
  `last_status`      VARCHAR(16) NOT NULL DEFAULT 'idle' COMMENT 'idle/running/success/failed',
  `last_message`     VARCHAR(255) NULL                   COMMENT '最近一次执行结果摘要',
  `updated_at`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`job_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='采集任务状态';

-- 10. 管理操作审计 -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admin_audit_log` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `operator_id`   BIGINT UNSIGNED NULL                    COMMENT '操作人 admin_user.id（系统操作可为空）',
  `operator_name` VARCHAR(64)     NOT NULL                COMMENT '操作人名称快照',
  `action`        VARCHAR(32)     NOT NULL                COMMENT 'login/logout/create/update/delete 等',
  `target_type`   VARCHAR(32)     NOT NULL                COMMENT 'region/intersection/auth 等',
  `target_id`     VARCHAR(64)     NOT NULL                COMMENT '目标标识',
  `detail`        JSON            NULL                    COMMENT '操作明细',
  `created_at`    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_created` (`created_at`),
  KEY `idx_operator` (`operator_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='管理操作审计';