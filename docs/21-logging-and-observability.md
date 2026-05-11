# Logging and Observability

## Definition

Observability helps detect, diagnose, and resolve production issues quickly.

## Logging Syntax

```python
LOGGING = {
  'version': 1,
  'disable_existing_loggers': False,
  'formatters': {
    'standard': {
      'format': '%(asctime)s %(levelname)s %(name)s %(message)s',
    },
  },
  'handlers': {
    'console': {
      'class': 'logging.StreamHandler',
      'formatter': 'standard',
    },
  },
  'loggers': {
    'django': {
      'handlers': ['console'],
      'level': 'INFO',
      'propagate': True,
    },
  },
}
```

## Best Practices

- structured logs for machine parsing
- correlation ids for request tracing
- separate error, audit, and app logs
- alerting on error rate and latency spikes
