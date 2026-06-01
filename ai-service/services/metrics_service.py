# -*- coding: utf-8 -*-
"""
Metrics Service
=============
Simple in-memory metrics tracking for API endpoints.

Provides:
- Request counting
- Latency tracking
- Error tracking
- P50/P95/P99 percentiles

Author: Restart-35
Date: 2026-06-01
"""

import time
import threading
from collections import defaultdict
from functools import wraps
from typing import Dict, List, Callable, Any
from dataclasses import dataclass, field

# Try to import numpy for percentile calculation
try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False

import logging
logger = logging.getLogger(__name__)


@dataclass
class MetricData:
    """Container for metric data"""
    latencies: List[float] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    count: int = 0


class MetricsService:
    """
    In-memory metrics service.

    Thread-safe implementation for tracking:
    - Request counts per endpoint
    - Latency distributions
    - Error tracking
    """

    def __init__(self, max_latencies: int = 10000):
        """
        Initialize metrics service.

        Args:
            max_latencies: Maximum latencies to store (for memory efficiency)
        """
        self._metrics: Dict[str, MetricData] = defaultdict(MetricData)
        self._lock = threading.Lock()
        self._max_latencies = max_latencies
        self._start_time = time.time()

    def record_request(
        self,
        endpoint: str,
        latency_ms: float,
        error: str = None
    ):
        """
        Record a request metric.

        Args:
            endpoint: Endpoint name (e.g., "skill-gap/analyze")
            latency_ms: Request latency in milliseconds
            error: Error message if request failed
        """
        with self._lock:
            metric = self._metrics[endpoint]

            # Record latency (keep last N)
            metric.latencies.append(latency_ms)
            if len(metric.latencies) > self._max_latencies:
                metric.latencies = metric.latencies[-self._max_latencies:]

            # Record error
            if error:
                metric.errors.append(error)

            # Increment count
            metric.count += 1

    def get_metrics(self) -> Dict[str, Any]:
        """
        Get all metrics.

        Returns:
            Dictionary with metrics per endpoint and overall
        """
        with self._lock:
            endpoints = dict(self._metrics)

        result = {
            "endpoints": {},
            "overall": {
                "total_requests": 0,
                "total_errors": 0,
                "avg_latency_ms": 0.0,
                "p50_latency_ms": 0.0,
                "p95_latency_ms": 0.0,
                "p99_latency_ms": 0.0,
            },
            "uptime_seconds": time.time() - self._start_time
        }

        all_latencies = []

        for endpoint, metric in endpoints.items():
            endpoint_latencies = metric.latencies
            all_latencies.extend(endpoint_latencies)

            endpoint_metrics = {
                "count": metric.count,
                "error_count": len(metric.errors),
                "error_rate": len(metric.errors) / metric.count if metric.count > 0 else 0,
                "avg_latency_ms": sum(endpoint_latencies) / len(endpoint_latencies) if endpoint_latencies else 0,
                "min_latency_ms": min(endpoint_latencies) if endpoint_latencies else 0,
                "max_latency_ms": max(endpoint_latencies) if endpoint_latencies else 0,
            }

            if NUMPY_AVAILABLE and endpoint_latencies:
                endpoint_metrics.update({
                    "p50_latency_ms": float(np.percentile(endpoint_latencies, 50)),
                    "p95_latency_ms": float(np.percentile(endpoint_latencies, 95)),
                    "p99_latency_ms": float(np.percentile(endpoint_latencies, 99)),
                })
            else:
                sorted_latencies = sorted(endpoint_latencies)
                n = len(sorted_latencies)
                endpoint_metrics.update({
                    "p50_latency_ms": sorted_latencies[n // 2] if n > 0 else 0,
                    "p95_latency_ms": sorted_latencies[int(n * 0.95)] if n > 0 else 0,
                    "p99_latency_ms": sorted_latencies[int(n * 0.99)] if n > 0 else 0,
                })

            result["endpoints"][endpoint] = endpoint_metrics

        # Overall metrics
        if all_latencies:
            result["overall"]["total_requests"] = sum(m.count for m in endpoints.values())
            result["overall"]["total_errors"] = sum(len(m.errors) for m in endpoints.values())
            result["overall"]["avg_latency_ms"] = sum(all_latencies) / len(all_latencies)

            if NUMPY_AVAILABLE:
                result["overall"]["p50_latency_ms"] = float(np.percentile(all_latencies, 50))
                result["overall"]["p95_latency_ms"] = float(np.percentile(all_latencies, 95))
                result["overall"]["p99_latency_ms"] = float(np.percentile(all_latencies, 99))
            else:
                sorted_all = sorted(all_latencies)
                n = len(sorted_all)
                result["overall"]["p50_latency_ms"] = sorted_all[n // 2] if n > 0 else 0
                result["overall"]["p95_latency_ms"] = sorted_all[int(n * 0.95)] if n > 0 else 0
                result["overall"]["p99_latency_ms"] = sorted_all[int(n * 0.99)] if n > 0 else 0

        return result

    def get_endpoint_metrics(self, endpoint: str) -> Dict[str, Any]:
        """Get metrics for specific endpoint"""
        with self._lock:
            metric = self._metrics.get(endpoint)

        if not metric:
            return {
                "count": 0,
                "error_count": 0,
                "avg_latency_ms": 0
            }

        latencies = metric.latencies
        return {
            "count": metric.count,
            "error_count": len(metric.errors),
            "avg_latency_ms": sum(latencies) / len(latencies) if latencies else 0,
            "p95_latency_ms": float(np.percentile(latencies, 95)) if NUMPY_AVAILABLE and latencies else 0,
        }

    def reset(self):
        """Reset all metrics"""
        with self._lock:
            self._metrics.clear()
            self._start_time = time.time()
        logger.info("Metrics reset")


# Singleton instance
_metrics_service: MetricsService = None


def get_metrics_service() -> MetricsService:
    """Get singleton metrics service"""
    global _metrics_service
    if _metrics_service is None:
        _metrics_service = MetricsService()
    return _metrics_service


def reset_metrics():
    """Reset metrics singleton (for testing)"""
    global _metrics_service
    if _metrics_service:
        _metrics_service.reset()
    _metrics_service = None


def track_request(endpoint: str):
    """
    Decorator to track request metrics.

    Usage:
        @router.post("/analyze")
        @track_request("skill-gap/analyze")
        async def analyze_skill_gap(request: SkillGapRequest):
            ...

    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            error = None

            try:
                result = await func(*args, **kwargs)
                return result
            except Exception as e:
                error = str(e)
                raise
            finally:
                elapsed_ms = (time.time() - start_time) * 1000
                get_metrics_service().record_request(endpoint, elapsed_ms, error)

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            error = None

            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                error = str(e)
                raise
            finally:
                elapsed_ms = (time.time() - start_time) * 1000
                get_metrics_service().record_request(endpoint, elapsed_ms, error)

        # Return appropriate wrapper based on function type
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator


def get_metrics() -> Dict[str, Any]:
    """
    Get current metrics (convenience function).

    Returns:
        Dictionary with all metrics
    """
    return get_metrics_service().get_metrics()


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("Testing Metrics Service")
    print("=" * 60)

    # Reset for clean test
    reset_metrics()
    metrics = get_metrics_service()

    # Simulate requests
    print("\nSimulating requests...")

    import random
    for i in range(100):
        latency = random.uniform(10, 200)
        error = "Test error" if random.random() < 0.05 else None
        metrics.record_request("skill-gap/analyze", latency, error)

    # Get metrics
    result = metrics.get_metrics()

    print(f"\nOverall Metrics:")
    overall = result["overall"]
    print(f"  Total Requests: {overall['total_requests']}")
    print(f"  Total Errors: {overall['total_errors']}")
    print(f"  Avg Latency: {overall['avg_latency_ms']:.1f}ms")
    print(f"  P95 Latency: {overall['p95_latency_ms']:.1f}ms")
    print(f"  P99 Latency: {overall['p99_latency_ms']:.1f}ms")

    print(f"\nEndpoint Metrics:")
    for endpoint, stats in result["endpoints"].items():
        print(f"  {endpoint}:")
        print(f"    Count: {stats['count']}")
        print(f"    Error Rate: {stats['error_rate']:.1%}")
        print(f"    P95: {stats['p95_latency_ms']:.1f}ms")

    print("\n" + "=" * 60)
    print("SUCCESS")
    print("=" * 60)
