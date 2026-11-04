ALTER TABLE `polls` ADD `reminded_at` integer;--> statement-breakpoint
ALTER TABLE `voters` ADD `remind` integer DEFAULT false NOT NULL;