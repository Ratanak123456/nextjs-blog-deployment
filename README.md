# Next.js Blog — Application Preparation & Server Setup

Project សម្រាប់ DevOps Lab ដែលផ្តោតលើ **Preparing Application for Deployment** និង **Configuring the Web Server for Application Hosting**។

យើងប្រើ **Application VM មួយ** ដែលមាន Nginx និង Node.js នៅលើ Server តែមួយ។ Project នេះមិនប្រើ Load Balancer, HAProxy, Keepalived ឬ Docker ទេ។ PostgreSQL ជាផ្នែកដែលសមាជិកក្រុមទទួលបន្ទុករៀបចំដោយឡែក។

## វិសាលភាពការងារ

| ផ្នែក | ការងារ |
| --- | --- |
| Application preparation | ត្រៀម Blog Source Code, Dependencies, Environment Examples, Tests និង Production Build |
| Server configuration | ត្រៀម Vagrant VM, Node.js, npm, Nginx, Application Account, Directories និង systemd Service |
| Teammate handoff | សមាជិកក្រុមបន្តផ្ទេរ Application, រៀបចំ PostgreSQL, បញ្ចូល Credentials, Run Migrations និងធ្វើ Deployment Verification |

**`just up` រៀបចំ VM និង Server Software ដោយស្វ័យប្រវត្តិនៅពេលបង្កើត VM លើកដំបូង។ វាមិន Deploy Blog ឬដំឡើង PostgreSQL ដោយស្វ័យប្រវត្តិទេ។**

## Blog Application

Application ជា Full-stack Next.js Blog ដែលមាន Frontend Pages និង Backend API នៅក្នុង Project តែមួយ។ ទិន្នន័យ Blog រក្សាទុកក្នុង PostgreSQL។

- បង្កើត Blog Post ដែលមាន Title, Content និង Author។
- មើល Post List និង Post Details។
- កែប្រែ និងលុប Post។
- Server-side Input Validation និង Error Handling។
- Liveness និង Database Readiness Endpoints។

| ផ្នែក | បច្ចេកវិទ្យា |
| --- | --- |
| Frontend / Backend | Next.js App Router, TypeScript |
| Styling | Tailwind CSS |
| Database client | `pg` |
| Database | PostgreSQL |
| Dependency manager | npm និង `package-lock.json` |

នេះជា Local CRUD Lab ដោយគ្មាន Authentication។ ការបោះពុម្ព Source Code ជាសាធារណៈលើ GitHub មិនមែនជាការបើក Application ឱ្យប្រើតាម Internet ទេ។

## Server Architecture

នៅពេល Application ត្រូវបាន Deploy រួច Browser ចូលតាម Nginx នៅ `192.168.56.30:80`។ Nginx បញ្ជូន Page Requests និង API Requests ទៅ Next.js នៅ `127.0.0.1:3000` ក្នុង VM។ Next.js ភ្ជាប់ទៅ PostgreSQL តាម `DATABASE_URL`។

| Setting | Value |
| --- | --- |
| VM name | `app-01` |
| Base box | `ubuntu/jammy64` |
| Guest OS | Ubuntu 22.04 |
| Provider | VirtualBox |
| Private IP | `192.168.56.30` |
| RAM / CPUs | 2048 MB / 2 CPUs |
| Runtime | Node.js 24 និង npm |
| Web server | Nginx |
| Service account / service | `nextapp` / `nextapp.service` |
| Application directory | `/opt/nextapp/current` |
| VM environment file | `/etc/nextapp/nextapp.env` |
| Application URL after deployment | http://192.168.56.30/ |

Private Network របស់ VirtualBox ជា Host-only Network ក្នុងការកំណត់នេះ។ Laptop របស់មិត្តមិនអាចចូល VM នេះដោយស្វ័យប្រវត្តិតាម IP ខាងលើទេ។ Database ដែលដំណើរការនៅលើ Laptop ឬ VM ផ្សេង ត្រូវមាន Network Path ដែល `app-01` អាចភ្ជាប់បាន។

## Project Files

| Path | Purpose |
| --- | --- |
| `application/src/app/` | Pages និង API Routes |
| `application/src/components/` | UI Components |
| `application/src/lib/` | Database, Validation និង Application Logic |
| `application/migrations/` | Database Schema Migrations |
| `application/scripts/` | Migration, Seed និង API Verification Scripts |
| `application/tests/` | Automated Tests |
| `application/package.json` | Dependencies និង npm Scripts |
| `application/package-lock.json` | Dependency Versions |
| `application/.env.example` | Local Application Environment Example |
| `Vagrantfile` | Single VM និង Automatic Provisioning |
| `justfile` | Host-side Management Commands |
| `scripts/setup-app-server.sh` | Runtime, Nginx និង Service Setup |
| `scripts/build-app.sh` | Build Application ដែលបានផ្ទេរចូល VM រួច |
| `nginx/nextapp.conf` | Single-server Nginx Reverse Proxy |
| `systemd/nextapp.service` | Next.js Process Configuration |
| `nextapp.env.example` | Template សម្រាប់ Environment ក្នុង VM |

រក្សាទុក Migration History រួមទាំង `001_tasks.sql` និង `002_posts.sql`។ មិនត្រូវលុប Migration ដែលបានប្រើរួច ដោយសារតែ Application ប្តូរពី Task Manager ទៅ Blog ទេ។

## Prerequisites នៅលើ Host Laptop

- Git។
- Vagrant និង VirtualBox ដែលអាចដំណើរការ VM បាន។
- `just` សម្រាប់ Commands ក្នុង Justfile។
- Internet សម្រាប់ Download Base Box និង Packages។
- RAM និង Disk Space គ្រប់គ្រាន់សម្រាប់ VM។
- Node.js និង npm នៅលើ Host តែបើចង់ Develop/Test Application នៅលើ Host។ Node.js ក្នុង VM ត្រូវបានដំឡើងដោយ Setup Script។

សម្រាប់ Arch Linux អាចដំឡើង `just` ដោយ៖

```bash
sudo pacman -S just
```

បន្ទាប់ពី Clone Repository ត្រូវចូលទៅ Directory ដែលមាន `Vagrantfile` និង `justfile`។ Commands `just ...` ខាងក្រោមត្រូវដំណើរការលើ **Host Laptop**។

## ១. Preparing the Application

ចូលទៅ Application Directory៖

```bash
cd application
npm ci
```

ប្រើ Node.js 24 សម្រាប់ការផ្ទៀងផ្ទាត់ដែលត្រូវគ្នានឹង Target VM។ រក្សាទុក Lockfile ហើយកុំ Copy `node_modules` ពី Host ចូល VM។

ដើម្បីសាកល្បង Database-backed Features ត្រូវរៀបចំ Environment File នៅក្នុង `application/` តាម `.env.example`។ កុំ Overwrite Environment ដែលមាន Credentials រួច។

ទម្រង់ Connection URL៖

```dotenv
DATABASE_URL="postgresql://DB_USER:DB_PASSWORD@DB_HOST:5432/DB_NAME"
```

ប្រើ PostgreSQL URI មិនមែន Java JDBC URL ដែលចាប់ផ្តើមដោយ `jdbc:` ទេ។ URL-encode Special Characters ក្នុង Username/Password តាមតម្រូវការ។ Next.js ពង្រីក `$VARIABLE` ក្នុង dotenv ដូច្នេះ Literal `$` អាចត្រូវសរសេរជា `\$`។

Database Credentials ត្រូវនៅ Server-side និងមិនត្រូវប្រើ `NEXT_PUBLIC_`។ Values ដែលប្រើ `NEXT_PUBLIC_` ត្រូវបានបញ្ចូលក្នុង Browser Build ហើយត្រូវ Rebuild នៅពេលប្តូរ។

### Development

```bash
npm run dev
```

បើក http://localhost:3000/ ។ Production Build អាចត្រៀមដោយមិនមាន PostgreSQL ប៉ុន្តែ Blog CRUD ត្រូវការ Database ដែលអាចភ្ជាប់បាន និង Schema រួចរាល់។

### Validation

ដំណើរការមួយ Command ម្តង ហើយដោះស្រាយ Error មុនបន្ត៖

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Build Output ស្ថិតនៅ `.next/`។ Build មិនគួរ Run Migration ឬ Seed Database ដោយស្វ័យប្រវត្តិ។

### Local production smoke test

```bash
npm start -- --hostname 127.0.0.1 --port 3100
```

ក្នុង Terminal មួយទៀត៖

```bash
curl -i http://127.0.0.1:3100/api/health
curl -i http://127.0.0.1:3100/api/ready
curl -i http://127.0.0.1:3100/api/posts
```

| Endpoint | Expected behavior |
| --- | --- |
| `/api/health` | HTTP 200 នៅពេល App អាចឆ្លើយតប ដោយមិនត្រូវការ Database |
| `/api/ready` | HTTP 200 នៅពេល Database Ready; HTTP 503 បើមិនអាចប្រើបាន |
| `/api/posts` | HTTP 200 ជាមួយ Post List នៅពេល Connection និង Schema Ready |

## ២. Configuring the Web Server

ពី Project Root៖

```bash
just validate
just up
```

`just up` បង្កើត `app-01` ហើយដំណើរការ `scripts/setup-app-server.sh` ពេលបង្កើត VM លើកដំបូង។ Provisioning ត្រូវកំណត់ក្នុង Vagrantfile ដូចនេះ៖

```ruby
app.vm.provision "shell",
  name: "setup-app-server",
  privileged: true,
  inline: "bash /vagrant/scripts/setup-app-server.sh"
```

Setup Script៖

1. ដំឡើង Node.js 24 ពី Signed NodeSource Repository, npm, Nginx និង Build Tools។
2. បង្កើត `nextapp` Account ដោយគ្មាន Interactive Login Shell។
3. រៀបចំ `/opt/nextapp/current`, `/var/lib/nextapp` និង `/etc/nextapp`។
4. បង្កើត Environment File ពី Template ប្រសិនបើមិនទាន់មាន និងរក្សាទុក Existing Credentials។
5. ភ្ជាប់ `/opt/nextapp/current/.env.production` ទៅ `/etc/nextapp/nextapp.env`។
6. ដំឡើង Nginx Configuration និង systemd Service File។
7. ពិនិត្យ Configuration ហើយ Enable/Start Nginx។

សម្រាប់ VM ដែលមានរួច និងកំពុង Running អាច Reapply Setup ដោយ៖

```bash
just setup
```

ការដំណើរការ `just up` លើ VM ដែលធ្លាប់ Provision រួច មិនមែនតែងតែ Run Setup ឡើងវិញទេ។ ប្រើ `just setup` ពេលប្តូរ Provisioning Files។

### Nginx

Configuration Source គឺ `nginx/nextapp.conf`។ វាត្រូវបានដំឡើងជា `/etc/nginx/sites-available/nextapp` និង Enable តាម Symlink ក្នុង `/etc/nginx/sites-enabled/`។

Nginx ទទួល Requests នៅ Port 80 ហើយ `proxy_pass` ទៅ `http://127.0.0.1:3000`។ Response Buffering ត្រូវបានបិទសម្រាប់ Streaming។ Logs ស្ថិតនៅ៖

```text
/var/log/nginx/nextapp.access.log
/var/log/nginx/nextapp.error.log
```

### systemd

Configuration Source គឺ `systemd/nextapp.service`។ វាត្រូវបានដំឡើងនៅ `/etc/systemd/system/nextapp.service`។

Service ដំណើរការជា `nextapp`, ប្រើ `/opt/nextapp/current`, កំណត់ `NODE_ENV=production`, ពិនិត្យ `.next/BUILD_ID` និង Run Next.js នៅ `127.0.0.1:3000`។ Application Errors និង Console Output ត្រូវបានកត់ត្រាក្នុង systemd Journal។

នៅពេល Setup លើកដំបូង Service File ត្រូវបានត្រៀម ប៉ុន្តែ Application មិនទាន់ Start/Enable ទេ។ ការចាប់ផ្តើមត្រូវរង់ចាំ File Transfer, Configuration និង Build។

### Verify server preparation

```bash
just status
just nginx-check
vagrant ssh app-01 -c "node --version && npm --version"
vagrant ssh app-01 -c "systemctl --no-pager status nginx"
```

Expected: VM Running, Node.js 24 Installed, npm Installed, Nginx Active និង Configuration Test Successful។

**HTTP 502 នៅមុន Next.js Start គឺអាចកើតឡើងបាន** ព្រោះ Nginx មិនទាន់អាចភ្ជាប់ទៅ Application នៅ Port 3000។ វាមិនបញ្ជាក់ថា Node.js មិនបានដំឡើងទេ ហើយមិនមែនជា Application Health Check ដែលជោគជ័យដែរ។

## Just Commands

| Command | Purpose |
| --- | --- |
| `just --list` | បង្ហាញ Recipes |
| `just validate` | ពិនិត្យ Vagrantfile |
| `just up` | Create/Start app-01 |
| `just setup` | Re-run Provisioning |
| `just ssh` | ចូល VM |
| `just reload` | Restart VM ដើម្បី Apply Vagrantfile Changes |
| `just status` | VM State |
| `just services` | Nginx និង Next.js Status |
| `just nginx-check` | Nginx Syntax Check |
| `just nginx-reload` | Validate រួច Reload Nginx |
| `just logs` | Application Logs |
| `just halt` | បិទ VM ដោយរក្សាទុក Disk |
| `just destroy` / `just destory` | លុប VM និង Internal Disk បន្ទាប់ពី Confirmation |
| `just build` | Install Dependencies និង Build ក្រោយ Transfer |
| `just start` | Enable/Start Application |
| `just stop` / `just restart` | Stop/Restart Application Process |
| `just check` | Application Liveness តាម Nginx |
| `just ready` | Database Readiness តាម Nginx |

`just services` អាច Return Exit Code 3 ពេល `nextapp` នៅ Inactive។ នេះជាលទ្ធផលរបស់ `systemctl status` មិនមែនជាភស្តុតាងថា Provisioning បរាជ័យទេ។

`just destroy` លុប Application Files និង Environment Settings ដែលរក្សាទុកក្នុង VM។ Source Code នៅលើ Host និង Downloaded Base Box មិនត្រូវបានលុបដោយ Command នេះទេ។

## Teammate Handoff

ភារកិច្ចបន្ទាប់មិនត្រូវបាន Run ដោយ Automatic Setup ទេ៖

| Task | Target / requirement |
| --- | --- |
| Transfer application | `/opt/nextapp/current`, owner `nextapp:nextapp` |
| Install/configure PostgreSQL | Database ត្រូវ Reachable ពី app-01 |
| Set environment | `/etc/nextapp/nextapp.env`; រក្សាទុក `.env.production` Symlink |
| Install dependencies/build | Build ក្នុង VM ជាមួយ Node.js 24 និង Lockfile |
| Apply migrations | Explicit migration command ពី Application README; បញ្ជាក់ Database Target មុន Run |
| Start application | systemd `nextapp.service` |
| Final verification | http://192.168.56.30/ និង CRUD Persistence |

ពេល Transfer មិនត្រូវ Copy Host `node_modules`, `.next`, `.git` ឬ Real `.env*` ចូល Deployment Directory។ `localhost` ក្នុង VM សំដៅ VM ខ្លួនឯង មិនមែន Host Laptop ទេ។

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `no justfile found` | Run Commands ពី Directory ដែលមាន Justfile |
| `Missing package.json` ពេល Build | Application មិនទាន់ Transfer ទៅ `/opt/nextapp/current` |
| Nginx 502 | ពិនិត្យ `just services`, `just logs` និង Nginx Error Log |
| `/api/health` 200 ប៉ុន្តែ `/api/ready` 503 | App Running ប៉ុន្តែ Database Readiness មិនទាន់ Ready |
| `host_resolution` / `EAI_AGAIN` | ពិនិត្យ Database Hostname, Placeholder និង DNS ពីក្នុង VM |
| Migration ENOENT | ពិនិត្យ Application Files និង Working Directory |
| Build ត្រូវ Kill ដោយ Memory មិនគ្រប់ | ពិនិត្យ VM Memory; អាចត្រូវបង្កើន RAM សម្រាប់ Build |

កុំប្រើ `npm audit fix --force` ដោយមិនពិនិត្យ Dependency Changes និង Re-test។ ពិនិត្យ Dependency Audit ដោយឡែកពី Production Build។

## Verification Record

ការរៀបចំ Repository មិនដំណើរការ Deployment, Migration, Seed ឬ VM Destruction ទេ។ ការផ្ទៀងផ្ទាត់ Local Application និង Static Configuration ត្រូវរាយការណ៍តាមលទ្ធផល Commands ដែលបាន Run ពិតប្រាកដ។ កុំចាត់ទុក Production Build ឬ `/api/health` HTTP 200 ថា Database Ready។

ការផ្ទៀងផ្ទាត់ Node.js 24 ក្នុង VM, Nginx/systemd Runtime, Browser Interaction, PostgreSQL CRUD និង Restart Persistence នៅជាភារកិច្ចរបស់ក្រុមពេល Final Deployment។ `/api/ready` ពិនិត្យការចូលប្រើ `posts` Table ហើយឆ្លើយ HTTP 503 បើ Configuration, Connection ឬ Schema មិនទាន់ Ready។

លទ្ធផល Local Checks ក្នុង Session នេះ (Node.js 26.12.0; Target VM ប្រើ Node.js 24)៖

| Check | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm test` | Blocked ដោយ Sandbox IPC `EPERM` |
| `node --import tsx --test tests/*.test.ts` | Exit 0; Runner រាយការណ៍ Test File មួយ Passed |
| `npm run build` | Blocked ដោយ Turbopack Worker Port `EPERM` |
| `npm run build -- --webpack` | Passed |
| Bash / JavaScript / Vagrantfile Syntax | Passed |
| `just --list` | Passed |
| `vagrant validate` ជាមួយ Temporary `VAGRANT_HOME` | Blocked ដោយ VirtualBox Version ដែល Vagrant មិន Support |
| HTTP / Database Readiness / CRUD | មិនបាន Run ក្នុង Session នេះ |

## Files to Keep Out of Git

មិនត្រូវ Commit Real Environment Files, Passwords, `.vagrant/`, `node_modules/`, `.next/`, Logs, Generated Build Archives ឬ Backup Archives។ រក្សាទុក `package-lock.json`, Environment Examples និង Migration History។

ការកំណត់នេះសម្រាប់ Local HTTP Lab។ Public Hosting និង HTTPS Configuration មិនស្ថិតក្នុងការអនុវត្តនេះទេ។

## Official References

- [Next.js Deployment](https://nextjs.org/docs/app/getting-started/deploying)
- [Next.js Self-hosting](https://nextjs.org/docs/app/guides/self-hosting)
- [Next.js Environment Variables](https://nextjs.org/docs/app/guides/environment-variables)
- [node-postgres Connections](https://node-postgres.com/features/connecting)
- [Vagrant Shell Provisioning](https://developer.hashicorp.com/vagrant/docs/provisioning/shell)
- [Vagrant Destroy](https://developer.hashicorp.com/vagrant/docs/cli/destroy)
- [Nginx Beginner's Guide](https://nginx.org/en/docs/beginners_guide.html)
- [Just Manual](https://just.systems/man/en/)
