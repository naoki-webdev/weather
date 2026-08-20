output "render_blueprint_summary" {
  description = "Non-secret summary of the Render Blueprint settings checked by Terraform."
  value = {
    service_name      = try(local.service.name, null)
    runtime           = try(local.service.runtime, null)
    plan              = try(local.service.plan, null)
    auto_deploy       = try(local.service.autoDeploy, null)
    health_check_path = try(local.service.healthCheckPath, null)
    env_var_keys      = sort(keys(local.env_vars))
  }
}
