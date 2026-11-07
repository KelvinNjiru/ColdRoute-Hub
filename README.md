# ColdRoute Kenya – MVP

## Run locally
    docker compose up -d
    cp .env.example .env && npm install
    npx prisma db push && npm run db:seed      # prints the hub id
    npm run dev                                 # API on :3000 (SMS mocked until AT_API_KEY set)
    cd frontend && npm install && npm run dev   # dashboard on :5173

## Test USSD without a gateway
    curl -X POST localhost:3000/api/v1/ussd -d "sessionId=s1&serviceCode=*384*254#&phoneNumber=+254712345678&text="
    curl -X POST localhost:3000/api/v1/ussd -d "sessionId=s1&serviceCode=*384*254#&phoneNumber=+254712345678&text=2*1*10*3*1"

## Telemetry / alert test
    HUB_ID=<uuid> npm run simulate          # DOOR=1 to trigger the >10C operator SMS

## Africa's Talking
Create a USSD channel in the sandbox, set callback to https://<ngrok>/api/v1/ussd, then set AT_API_KEY to send real SMS.
