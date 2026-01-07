# Troubleshooting PostgreSQL Connection Issues

## How to Verify PostgreSQL is Running

### 1. Check ECS Task Status

**In AWS Console:**
1. Go to **ECS** → **Clusters** → `dev02-cluster`
2. Click on **Tasks** tab
3. Find your backend task (should show `RUNNING` status)
4. Click on the task ID
5. Check **Containers** section:
   - **postgres** container should show: `RUNNING` status
   - **backend** container should show: `RUNNING` status
   - Both should have **Runtime ID** (if missing, container isn't running)

### 2. Check Container Logs

**PostgreSQL Container Logs:**
1. In ECS Task details → Click on **postgres** container
2. Click **View logs in CloudWatch**
3. Look for these messages:
   ```
   ✅ Good signs:
   - "database system is ready to accept connections"
   - "listening on IPv4 address \"0.0.0.0\", port 5432"
   - "listening on IPv6 address \"::\", port 5432"
   
   ❌ Bad signs:
   - "database system is shut down"
   - "received fast shutdown request"
   - "FATAL: database files are incompatible"
   ```

**Backend Container Logs:**
1. In ECS Task details → Click on **backend** container
2. Click **View logs in CloudWatch**
3. Look for:
   ```
   ✅ Good signs:
   - "✅ Database tables created successfully!"
   - "Uvicorn running on http://0.0.0.0:8000"
   - "Attempting to connect to database (attempt X/10)..."
   
   ❌ Bad signs:
   - "Connection refused"
   - "Failed to connect to database after 10 attempts"
   - "Port 5432 on localhost is not accessible"
   ```

### 3. Check Task Definition

**Verify both containers are defined:**
1. Go to **ECS** → **Task Definitions**
2. Find `demo-backend-demo` (or your task definition name)
3. Click on latest revision
4. Check **Container definitions**:
   - Should see **2 containers**: `postgres` and `backend`
   - Both should have `essential = true`
   - `backend` should have `dependsOn` with `postgres`

### 4. Check Health Checks

**PostgreSQL Health Check:**
- Command: `pg_isready -U photoportal -h localhost -p 5432 -d photoportal`
- Should show `HEALTHY` status in ECS Console
- If `UNHEALTHY`, check PostgreSQL logs for errors

**Backend Health Check:**
- Command: `curl -f http://localhost:8000/health`
- Should show `HEALTHY` after database connection succeeds
- If `UNHEALTHY`, check backend logs

### 5. Common Issues and Solutions

#### Issue 1: PostgreSQL Container Not Starting

**Symptoms:**
- No runtime ID for postgres container
- Task shows `STOPPED` status
- Error: "Essential container in task exited"

**Solutions:**
- Check CloudWatch logs for PostgreSQL errors
- Verify PostgreSQL has enough resources (CPU/Memory)
- Check if database initialization failed
- Verify environment variables are correct

#### Issue 2: PostgreSQL Starts Then Stops

**Symptoms:**
- PostgreSQL logs show "database system is ready" then "shut down"
- Container restarts repeatedly

**Solutions:**
- Increase PostgreSQL memory (currently 1024 MB)
- Check for OOM (Out of Memory) errors in logs
- Verify health check isn't killing the container
- Check if PostgreSQL is receiving shutdown signals

#### Issue 3: Backend Can't Connect to PostgreSQL

**Symptoms:**
- Backend logs show "Connection refused"
- Backend retries but fails
- PostgreSQL logs show it's running

**Solutions:**
- Verify PostgreSQL is listening on `0.0.0.0:5432` (check logs)
- Check if port mapping is configured
- Verify `dependsOn` condition (should be `START` not `HEALTHY`)
- Check if both containers are in same task
- Verify `DATABASE_URL` uses `localhost:5432`

#### Issue 4: Port Not Accessible

**Symptoms:**
- Backend logs: "Port 5432 on localhost is not accessible"
- Socket connection fails

**Solutions:**
- Verify PostgreSQL port mapping exists
- Check if PostgreSQL is actually listening (check logs)
- Verify bridge network mode is configured
- Check if firewall/security groups are blocking

## Diagnostic Commands

### Check PostgreSQL Status (from backend container)

If you can exec into the backend container:
```bash
# Check if PostgreSQL port is open
nc -zv localhost 5432

# Try to connect with psql
psql -h localhost -U photoportal -d photoportal

# Check if PostgreSQL process is running
ps aux | grep postgres
```

### Check Network Connectivity

```bash
# From backend container, check if port is accessible
telnet localhost 5432

# Or use netcat
nc -zv localhost 5432
```

## Expected Log Sequence

### Successful Startup:
```
[PostgreSQL Container]
2026-01-07 20:00:00 UTC [1] LOG: starting PostgreSQL 15.15
2026-01-07 20:00:01 UTC [1] LOG: listening on IPv4 address "0.0.0.0", port 5432
2026-01-07 20:00:01 UTC [1] LOG: listening on IPv6 address "::", port 5432
2026-01-07 20:00:02 UTC [1] LOG: database system is ready to accept connections

[Backend Container]
INFO:app.main:Attempting to connect to database (attempt 1/10)...
INFO:app.main:✅ Database tables created successfully!
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Failed Startup:
```
[PostgreSQL Container]
2026-01-07 20:00:00 UTC [1] LOG: starting PostgreSQL 15.15
2026-01-07 20:00:01 UTC [1] LOG: received fast shutdown request
2026-01-07 20:00:02 UTC [1] LOG: database system is shut down

[Backend Container]
WARNING:app.main:Database not ready yet, retrying in 5 seconds...
ERROR:app.main:❌ Failed to connect to database after 10 attempts
```

## Quick Checklist

- [ ] Both containers show `RUNNING` status in ECS Console
- [ ] Both containers have Runtime IDs
- [ ] PostgreSQL logs show "database system is ready to accept connections"
- [ ] PostgreSQL logs show "listening on IPv4 address \"0.0.0.0\", port 5432"
- [ ] Backend logs show "✅ Database tables created successfully!"
- [ ] No "Connection refused" errors in backend logs
- [ ] No "shut down" messages in PostgreSQL logs
- [ ] Health checks show `HEALTHY` status

## Next Steps if Still Failing

1. **Check Task Stopped Reason:**
   - ECS Console → Tasks → Click task → Check "Stopped reason"

2. **Check CloudWatch Metrics:**
   - CPU/Memory utilization
   - Check if hitting resource limits

3. **Review Task Definition:**
   - Verify both containers are defined correctly
   - Check resource allocations
   - Verify environment variables

4. **Consider Alternative:**
   - Use AWS RDS for managed PostgreSQL (more reliable but costs more)
   - Use separate ECS service for PostgreSQL (better isolation)

