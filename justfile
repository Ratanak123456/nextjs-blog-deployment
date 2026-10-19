# Run on your laptop from the deployment directory.
set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

default:
    @just --list

# Also accept your spelling: just destory
alias destory := destroy

# Validate the Vagrantfile.
validate:
    vagrant validate

# Create/start the VM. First creation also runs provisioning.
up:
    vagrant up app-01 --provider=virtualbox

# Open a shell inside the VM.
ssh:
    vagrant ssh app-01

# Install or reapply the server configuration.
setup:
    vagrant provision app-01

# Restart the VM and apply Vagrantfile changes.
reload:
    vagrant reload app-01

# Build after the application files have been transferred.
build:
    vagrant ssh app-01 -c "sudo bash /vagrant/scripts/build-app.sh"

# Start the application and enable startup after reboot.
start:
    vagrant ssh app-01 -c "sudo systemctl daemon-reload && sudo systemctl enable --now nextapp"

# Stop only the Next.js application.
stop:
    vagrant ssh app-01 -c "sudo systemctl stop nextapp"

# Restart only the Next.js application.
restart:
    vagrant ssh app-01 -c "sudo systemctl restart nextapp"

# Show the VM's state.
status:
    vagrant status app-01

# Show Nginx and Next.js service status.
services:
    vagrant ssh app-01 -c "systemctl --no-pager status nginx nextapp"

# Show application output and errors.
logs:
    vagrant ssh app-01 -c "sudo journalctl -u nextapp -n 100 --no-pager"

# Validate the Nginx configuration.
nginx-check:
    vagrant ssh app-01 -c "sudo nginx -t"

# Reload Nginx only if its configuration is valid.
nginx-reload:
    vagrant ssh app-01 -c "sudo nginx -t && sudo systemctl reload nginx"

# Check application liveness through Nginx.
check:
    curl --fail --show-error --max-time 15 http://192.168.56.30/api/health

# Check database readiness through Nginx.
ready:
    curl --fail --show-error --max-time 15 http://192.168.56.30/api/ready

# Shut down the VM while keeping its disk.
halt:
    vagrant halt app-01

# Delete app-01 and its internal disk, with confirmation.
destroy:
    vagrant destroy app-01