-- v42: Founding Family Programme plan code. Re-runnable (drop constraint, then add it back).
alter table student_access drop constraint if exists student_access_plan_code_check;
alter table student_access add constraint student_access_plan_code_check
  check (plan_code in ('free','per_subject_monthly','five_monthly','five_till_march','founding_family','grandfathered','custom'));
