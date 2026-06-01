# Restart-35 AI Service - Production Deployment Checklist

## Pre-Deployment

### Code Quality
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] No critical warnings or errors
- [ ] Code review completed

### Documentation
- [ ] API documentation at /docs complete
- [ ] README updated with deployment instructions
- [ ] Environment variables documented in .env.example
- [ ] Health check endpoint working

## Security

### API Keys
- [ ] GROQ_API_KEY set in environment
- [ ] API keys not committed to repository
- [ ] .env file in .gitignore

### Network
- [ ] CORS configured for production domains
- [ ] Rate limiting enabled
- [ ] No sensitive data in logs

### Dependencies
- [ ] No known security vulnerabilities (run: `pip audit`)
- [ ] All dependencies pinned to specific versions
- [ ] Docker base image updated

## Performance

### Benchmarks
- [ ] Load test completed (>50 requests)
- [ ] P95 latency < 5s for API
- [ ] P95 latency < 500ms for prefilter
- [ ] Error rate < 1%

### Optimization
- [ ] Cache enabled (Redis or in-memory)
- [ ] Connection pooling configured
- [ ] Response compression enabled

## Infrastructure

### Docker
- [ ] Dockerfile builds successfully
- [ ] Docker Compose works
- [ ] Health check configured
- [ ] Restart policy set

### Monitoring
- [ ] Metrics endpoint working (/api/v1/skill-gap/metrics)
- [ ] Health check configured
- [ ] Logging configured (INFO level)
- [ ] Error tracking setup (optional: Sentry)

## Deployment

### Local Testing
```bash
# Run all tests
cd ai-service
python -m pytest tests/ -v

# Run benchmark
python scripts/benchmark.py

# Test with Docker
docker-compose up -d
curl http://localhost:8000/health
```

### Production Deployment
```bash
# 1. Build image
docker build -t restart35-ai-service .

# 2. Set environment variables
export GROQ_API_KEY=your_key

# 3. Run container
docker run -d -p 8000:8000 \
  -e GROQ_API_KEY=$GROQ_API_KEY \
  restart35-ai-service

# Or use Docker Compose
docker-compose -f docker-compose.yml up -d
```

### Kubernetes (Optional)
```bash
# Build and push image
docker build -t your-registry/restart35-ai-service:v1.0.0 .
docker push your-registry/restart35-ai-service:v1.0.0

# Apply manifests
kubectl apply -f k8s/
```

## Post-Deployment

### Verification
- [ ] Health check passing
- [ ] API responding correctly
- [ ] Metrics endpoint showing data
- [ ] Logs showing no errors

### Testing
```bash
# Test analyze endpoint
curl -X POST http://localhost:8000/api/v1/skill-gap/analyze \
  -H "Content-Type: application/json" \
  -d '{"user_skills": ["Excel"], "target_occupation": "Ke toan"}'

# Test metrics
curl http://localhost:8000/api/v1/skill-gap/metrics

# Test health
curl http://localhost:8000/api/v1/skill-gap/health
```

### Monitoring
- [ ] Monitor error rate
- [ ] Monitor latency (P95, P99)
- [ ] Monitor cache hit rate
- [ ] Set up alerts for errors

## Rollback Plan

If issues occur:
1. Stop new deployment
2. Revert to previous version
3. Check logs for errors
4. Run diagnostic tests

```bash
# Rollback
docker-compose down
docker pull restart35-ai-service:previous-version
docker-compose up -d
```

## Performance Targets

| Metric | Target | Critical |
|--------|--------|----------|
| API P50 Latency | < 1s | < 3s |
| API P95 Latency | < 5s | < 10s |
| Error Rate | < 0.1% | < 1% |
| Cache Hit Rate | > 50% | > 30% |
| Availability | > 99.9% | > 99% |

## Sign-off

- [ ] Developer: _________________ Date: _________
- [ ] QA: _________________ Date: _________
- [ ] DevOps: _________________ Date: _________
