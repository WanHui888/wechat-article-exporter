CREATE TABLE `article_comment_replies` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`fakeid` varchar(50) NOT NULL,
	`article_url` varchar(1000) NOT NULL,
	`title` varchar(500) NOT NULL,
	`content_id` varchar(100) NOT NULL,
	`data` json NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `article_comment_replies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `article_comments` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`fakeid` varchar(50) NOT NULL,
	`article_url` varchar(1000) NOT NULL,
	`title` varchar(500) NOT NULL,
	`data` json NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `article_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `article_html` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`fakeid` varchar(50) NOT NULL,
	`article_url` varchar(1000) NOT NULL,
	`title` varchar(500) NOT NULL,
	`comment_id` varchar(100),
	`file_path` varchar(500) NOT NULL,
	`file_size` bigint NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `article_html_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `article_metadata` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`fakeid` varchar(50) NOT NULL,
	`article_url` varchar(1000) NOT NULL,
	`title` varchar(500) NOT NULL,
	`read_num` int NOT NULL DEFAULT 0,
	`old_like_num` int NOT NULL DEFAULT 0,
	`share_num` int NOT NULL DEFAULT 0,
	`like_num` int NOT NULL DEFAULT 0,
	`comment_num` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `article_metadata_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `articles` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`fakeid` varchar(50) NOT NULL,
	`aid` varchar(50) NOT NULL,
	`title` varchar(500) NOT NULL,
	`link` varchar(1000) NOT NULL,
	`cover` varchar(500),
	`digest` text,
	`author_name` varchar(100),
	`create_time` int,
	`update_time` int,
	`appmsgid` bigint,
	`itemidx` int,
	`item_show_type` int NOT NULL DEFAULT 0,
	`copyright_stat` int,
	`copyright_type` int,
	`is_deleted` tinyint NOT NULL DEFAULT 0,
	`is_pay_subscribe` int NOT NULL DEFAULT 0,
	`is_favorited` tinyint NOT NULL DEFAULT 0,
	`album_id` varchar(50),
	`appmsg_album_infos` json,
	`media_duration` varchar(20),
	`status` varchar(50) NOT NULL DEFAULT '',
	`is_single` tinyint NOT NULL DEFAULT 0,
	`extra_data` json,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `articles_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_user_fakeid_aid` UNIQUE(`user_id`,`fakeid`,`aid`)
);
--> statement-breakpoint
CREATE TABLE `export_jobs` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`format` enum('html','excel','json','txt','markdown','word') NOT NULL,
	`fakeid` varchar(50),
	`article_urls` json NOT NULL,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`progress` int NOT NULL DEFAULT 0,
	`total` int NOT NULL DEFAULT 0,
	`file_path` varchar(500),
	`file_size` bigint DEFAULT 0,
	`error` text,
	`expires_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`completed_at` datetime,
	CONSTRAINT `export_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`article_id` bigint NOT NULL,
	`note` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `favorites_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_user_article` UNIQUE(`user_id`,`article_id`)
);
--> statement-breakpoint
CREATE TABLE `mp_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`fakeid` varchar(50) NOT NULL,
	`nickname` varchar(100),
	`alias` varchar(100),
	`round_head_img` varchar(500),
	`service_type` int DEFAULT 0,
	`signature` text,
	`total_count` int NOT NULL DEFAULT 0,
	`synced_count` int NOT NULL DEFAULT 0,
	`synced_articles` int NOT NULL DEFAULT 0,
	`completed` tinyint NOT NULL DEFAULT 0,
	`auto_sync` tinyint NOT NULL DEFAULT 0,
	`sync_interval` int DEFAULT 24,
	`last_sync_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mp_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_user_fakeid` UNIQUE(`user_id`,`fakeid`)
);
--> statement-breakpoint
CREATE TABLE `operation_logs` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`action` varchar(50) NOT NULL,
	`target_type` varchar(50),
	`target_id` varchar(100),
	`detail` json,
	`status` enum('success','failed','pending') NOT NULL DEFAULT 'success',
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `operation_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resource_maps` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`fakeid` varchar(50) NOT NULL,
	`article_url` varchar(1000) NOT NULL,
	`resources` json NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `resource_maps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resources` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`fakeid` varchar(50) NOT NULL,
	`resource_url` varchar(1000) NOT NULL,
	`file_path` varchar(500) NOT NULL,
	`file_size` bigint NOT NULL DEFAULT 0,
	`mime_type` varchar(100),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `resources_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_user_resource_url` UNIQUE(`user_id`,`resource_url`)
);
--> statement-breakpoint
CREATE TABLE `scheduled_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`type` enum('sync','download','cleanup') NOT NULL,
	`target_fakeid` varchar(50),
	`interval_hours` int NOT NULL DEFAULT 24,
	`enabled` tinyint NOT NULL DEFAULT 1,
	`last_run_at` datetime,
	`next_run_at` datetime,
	`status` enum('idle','running','error') NOT NULL DEFAULT 'idle',
	`last_error` text,
	`config` json,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduled_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`biz` varchar(50) NOT NULL,
	`uin` varchar(100) NOT NULL,
	`key` varchar(500) NOT NULL,
	`pass_ticket` varchar(500) NOT NULL,
	`wap_sid2` varchar(500),
	`nickname` varchar(100),
	`avatar` varchar(500),
	`timestamp` bigint NOT NULL,
	`valid` tinyint NOT NULL DEFAULT 1,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `user_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_user_biz` UNIQUE(`user_id`,`biz`)
);
--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`preferences` json NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_preferences_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(50) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`email` varchar(100),
	`nickname` varchar(50),
	`avatar` varchar(500),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`storage_quota` bigint NOT NULL DEFAULT 5368709120,
	`storage_used` bigint NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
	`last_login_at` datetime,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `wechat_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`auth_key` varchar(64) NOT NULL,
	`token` varchar(255) NOT NULL,
	`cookies` json NOT NULL,
	`mp_nickname` varchar(100),
	`mp_avatar` varchar(500),
	`expires_at` datetime NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `wechat_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `wechat_sessions_auth_key_unique` UNIQUE(`auth_key`)
);
--> statement-breakpoint
ALTER TABLE `article_comment_replies` ADD CONSTRAINT `article_comment_replies_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `article_comments` ADD CONSTRAINT `article_comments_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `article_html` ADD CONSTRAINT `article_html_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `article_metadata` ADD CONSTRAINT `article_metadata_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `articles` ADD CONSTRAINT `articles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `export_jobs` ADD CONSTRAINT `export_jobs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_article_id_articles_id_fk` FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mp_accounts` ADD CONSTRAINT `mp_accounts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `operation_logs` ADD CONSTRAINT `operation_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resource_maps` ADD CONSTRAINT `resource_maps_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resources` ADD CONSTRAINT `resources_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scheduled_tasks` ADD CONSTRAINT `scheduled_tasks_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_credentials` ADD CONSTRAINT `user_credentials_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_preferences` ADD CONSTRAINT `user_preferences_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wechat_sessions` ADD CONSTRAINT `wechat_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_user_fakeid` ON `article_html` (`user_id`,`fakeid`);--> statement-breakpoint
CREATE INDEX `idx_article_url` ON `article_html` (`article_url`);--> statement-breakpoint
CREATE INDEX `idx_user_fakeid_time` ON `articles` (`user_id`,`fakeid`,`create_time`);--> statement-breakpoint
CREATE INDEX `idx_user_favorite` ON `articles` (`user_id`,`is_favorited`);--> statement-breakpoint
CREATE INDEX `idx_user_status` ON `export_jobs` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_expires_at` ON `export_jobs` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_user_time` ON `operation_logs` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_action` ON `operation_logs` (`action`);--> statement-breakpoint
CREATE INDEX `idx_next_run` ON `scheduled_tasks` (`enabled`,`next_run_at`);--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `wechat_sessions` (`user_id`);