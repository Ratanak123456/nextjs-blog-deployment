Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/jammy64"

  config.vm.define "app-01" do |app|
    app.vm.hostname = "app-01"

    app.vm.network "private_network", ip: "192.168.56.30"

    app.vm.provider "virtualbox" do |vb|
      vb.memory = 2048
      vb.cpus = 2
    end

    app.vm.provision "shell",
      name: "setup-app-server",
      privileged: true,
      inline: "bash /vagrant/scripts/setup-app-server.sh"
  end
end