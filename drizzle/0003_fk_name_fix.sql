ALTER TABLE "sg_monitoring_alerts" DROP CONSTRAINT IF EXISTS "sg_monitoring_alerts_monitoring_task_id_sg_monitoring_tasks_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sg_monitoring_alerts" ADD CONSTRAINT "sg_monitoring_alerts_monitoring_task_id_sg_monitoring_tasks_id_" FOREIGN KEY ("monitoring_task_id") REFERENCES "public"."sg_monitoring_tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
