CREATE TABLE `library_meta` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`lock_token` text DEFAULT '' NOT NULL,
	`settings` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `library_records` (
	`collection` text NOT NULL,
	`id` text NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`collection`, `id`)
);
--> statement-breakpoint
CREATE INDEX `records_collection_idx` ON `library_records` (`collection`);