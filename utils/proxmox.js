const fetch = require('node-fetch');

class ProxmoxAPI {
  constructor(host, port, username, password, node) {
    this.host = host;
    this.port = port;
    this.username = username;
    this.password = password;
    this.node = node;
    this.baseURL = `https://${host}:${port}/api2/json`;
    this.ticket = null;
    this.CSRFPreventionToken = null;
  }

  async authenticate() {
    try {
      const response = await fetch(`${this.baseURL}/access/ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `username=${this.username}&password=${this.password}&realm=${config.proxmox.realm || 'pam'}`,
      });

      const data = await response.json();
      
      if (data.data) {
        this.ticket = data.data.ticket;
        this.CSRFPreventionToken = data.data.CSRFPreventionToken;
        return true;
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      console.error('Proxmox authentication error:', error);
      throw error;
    }
  }

  async request(endpoint, method = 'GET', data = null) {
    if (!this.ticket) {
      await this.authenticate();
    }

    const options = {
      method,
      headers: {
        'Cookie': `PVEAuthCookie=${this.ticket}`,
        'CSRFPreventionToken': this.CSRFPreventionToken,
      },
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      options.body = new URLSearchParams(data).toString();
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, options);
      const result = await response.json();
      
      if (result.errors) {
        throw new Error(result.errors[0]?.message || 'Proxmox API error');
      }
      
      return result.data;
    } catch (error) {
      console.error('Proxmox API request error:', error);
      throw error;
    }
  }

  // VM Management Methods
  async createVM(vmConfig) {
    const {
      vmid,
      name,
      cores = 1,
      memory = 512,
      disk = 8,
      storage = 'local-lvm',
      template = 'ubuntu-22.04-template',
      bridge = 'vmbr0'
    } = vmConfig;

    const config = {
      vmid: vmid,
      name: name,
      cores: cores,
      memory: memory * 1024, // Convert to MB
      scsi0: `${storage}:${disk}`,
      ide2: `${storage}:cloudinit`,
      net0: `virtio,bridge=${bridge}`,
      template: template,
      description: `VM created by Discord Bot for ${name}`
    };

    return await this.request(`/nodes/${this.node}/qemu`, 'POST', config);
  }

  async startVM(vmid) {
    return await this.request(`/nodes/${this.node}/qemu/${vmid}/status/start`, 'POST');
  }

  async stopVM(vmid) {
    return await this.request(`/nodes/${this.node}/qemu/${vmid}/status/stop`, 'POST');
  }

  async restartVM(vmid) {
    return await this.request(`/nodes/${this.node}/qemu/${vmid}/status/reboot`, 'POST');
  }

  async deleteVM(vmid) {
    return await this.request(`/nodes/${this.node}/qemu/${vmid}`, 'DELETE');
  }

  async getVMStatus(vmid) {
    return await this.request(`/nodes/${this.node}/qemu/${vmid}/status/current`);
  }

  async getVMConfig(vmid) {
    return await this.request(`/nodes/${this.node}/qemu/${vmid}/config`);
  }

  async listVMs() {
    return await this.request(`/nodes/${this.node}/qemu`);
  }

  async getVMResources(vmid) {
    const status = await this.getVMStatus(vmid);
    const config = await this.getVMConfig(vmid);
    
    return {
      status: status.status,
      cpu: config.cores || 1,
      memory: Math.round((config.memory || 0) / 1024),
      disk: await this.getVMDiskUsage(vmid),
      uptime: status.uptime || 0,
      name: config.name,
      vmid: vmid
    };
  }

  async getVMDiskUsage(vmid) {
    try {
      const disks = await this.request(`/nodes/${this.node}/qemu/${vmid}/agent/fstrim`, 'POST');
      // This is a simplified implementation
      return 0; // You would implement actual disk usage calculation here
    } catch (error) {
      return 0;
    }
  }

  async getNextVMID() {
    try {
      const response = await this.request('/cluster/nextid');
      return parseInt(response);
    } catch (error) {
      // Fallback: generate random VMID between 100-999
      return Math.floor(Math.random() * 900) + 100;
    }
  }
}

module.exports = ProxmoxAPI;
