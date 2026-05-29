
## Install on Amazon linux 2023

- Install Packages
```
# nvm 설치
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc

# 최신 LTS 설치 및 적용
nvm install --lts
nvm use --lts
nvm alias default 'lts/*'

# 확인
node --version
npm --version
```

- deploy code
```
sudo mkdir -p /srv/cloudgame-engine/frontend
sudo chown -R ec2-user:ec2-user /srv/cloudgame-engine

# 프로젝트 복사 (또는 git clone)
git clone https://github.com/wsscc2021/cloudgame-engine-frontend.git /srv/cloudgame-engine/frontend
```

- application setup
```
cd /srv/cloudgame-engine/frontend

# 가상환경 생성 및 패키지 설치
npm install

# 빌드
npm run build
```

- nginx setup

```
sudo tee /etc/nginx/conf.d/cloudgame.conf > /dev/null <<'EOF'
server {
    listen 80;
    server_name _;

    root /srv/cloudgame-engine/frontend/dist;
    index index.html;

    # Vue Router — 새로고침 시 index.html 반환
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Flask API 프록시
    location /api/ {
        proxy_pass         http://127.0.0.1:5000;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    }
}
EOF

sudo nginx -t          # 설정 문법 검사
sudo systemctl enable --now nginx
```
