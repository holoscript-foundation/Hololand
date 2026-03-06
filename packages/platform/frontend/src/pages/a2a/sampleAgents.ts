/**
 * Sample A2A Agent Cards for the Discovery Browser
 *
 * These represent realistic agent configurations spanning various
 * domains: code analysis, data processing, communication, DevOps,
 * and content generation.
 */

import type { AgentCardWithStatus } from './types';

export const sampleAgents: AgentCardWithStatus[] = [
  {
    id: 'agent-code-reviewer',
    name: 'Code Reviewer',
    description:
      'Performs automated code reviews with security analysis, best-practice checks, and performance profiling. Supports 15+ languages including TypeScript, Python, Rust, and Go.',
    url: 'https://agents.example.com/code-reviewer',
    version: '2.4.1',
    provider: {
      name: 'DevTools Corp',
      url: 'https://devtools.example.com',
      contactEmail: 'support@devtools.example.com',
    },
    skills: [
      {
        name: 'review_pull_request',
        description: 'Reviews a pull request for code quality, security vulnerabilities, and style compliance.',
        contentTypes: ['application/json', 'text/plain'],
      },
      {
        name: 'security_scan',
        description: 'Runs SAST analysis on source code to identify vulnerabilities.',
        contentTypes: ['application/json'],
      },
      {
        name: 'performance_profile',
        description: 'Analyzes code paths for performance bottlenecks and suggests optimizations.',
        contentTypes: ['application/json'],
      },
    ],
    capabilities: {
      streaming: true,
      pushNotifications: true,
      extendedAgentCard: false,
    },
    securitySchemes: {
      bearer: { type: 'http', scheme: 'bearer', description: 'JWT Bearer token' },
    },
    security: ['bearer'],
    interfaces: [{ type: 'jsonrpc', url: 'https://agents.example.com/code-reviewer/rpc' }],
    status: 'online',
    lastChecked: '2026-03-03T10:30:00Z',
    tags: ['development', 'security', 'code-quality'],
  },
  {
    id: 'agent-data-transformer',
    name: 'Data Transformer',
    description:
      'Converts, validates, and transforms structured data between formats including JSON, CSV, Parquet, Avro, and Protocol Buffers. Handles schema evolution and data lineage tracking.',
    url: 'https://data-agents.example.com/transformer',
    version: '3.1.0',
    provider: {
      name: 'DataFlow Inc',
      url: 'https://dataflow.example.com',
      contactEmail: 'agents@dataflow.example.com',
    },
    skills: [
      {
        name: 'convert_format',
        description: 'Converts data between supported formats with schema validation.',
        contentTypes: ['application/json', 'text/csv', 'application/avro', 'application/x-protobuf'],
      },
      {
        name: 'validate_schema',
        description: 'Validates data against a JSON Schema or Avro schema definition.',
        contentTypes: ['application/json'],
      },
      {
        name: 'transform_pipeline',
        description: 'Applies a sequence of transformations defined by a pipeline configuration.',
        contentTypes: ['application/json'],
      },
    ],
    capabilities: {
      streaming: true,
      pushNotifications: false,
      extendedAgentCard: true,
    },
    securitySchemes: {
      apiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key', description: 'API key in header' },
    },
    security: ['apiKey'],
    status: 'online',
    lastChecked: '2026-03-03T10:28:00Z',
    tags: ['data', 'etl', 'transformation'],
  },
  {
    id: 'agent-email-assistant',
    name: 'Email Assistant',
    description:
      'Drafts, summarizes, and categorizes emails. Provides intelligent reply suggestions, meeting extraction, and action-item detection across organizational inboxes.',
    url: 'https://comms.example.com/email-agent',
    version: '1.8.5',
    provider: {
      name: 'CommSuite',
      url: 'https://commsuite.example.com',
    },
    skills: [
      {
        name: 'draft_reply',
        description: 'Generates a context-aware email reply based on thread history.',
        contentTypes: ['text/plain', 'text/html'],
      },
      {
        name: 'summarize_thread',
        description: 'Produces a concise summary of an email conversation thread.',
        contentTypes: ['text/plain'],
      },
      {
        name: 'extract_action_items',
        description: 'Identifies and lists action items, deadlines, and assignees from emails.',
        contentTypes: ['application/json'],
      },
    ],
    capabilities: {
      streaming: false,
      pushNotifications: true,
      extendedAgentCard: false,
    },
    securitySchemes: {
      oauth2: { type: 'oauth2', description: 'OAuth 2.0 authorization code flow' },
    },
    security: ['oauth2'],
    status: 'online',
    lastChecked: '2026-03-03T10:25:00Z',
    tags: ['communication', 'productivity', 'email'],
  },
  {
    id: 'agent-k8s-operator',
    name: 'Kubernetes Operator',
    description:
      'Manages Kubernetes cluster operations including deployment rollouts, scaling decisions, health monitoring, and incident remediation. Integrates with Prometheus and Grafana.',
    url: 'https://ops.example.com/k8s-agent',
    version: '4.0.2',
    provider: {
      name: 'CloudOps Platform',
      url: 'https://cloudops.example.com',
      contactEmail: 'devops@cloudops.example.com',
    },
    skills: [
      {
        name: 'deploy_rollout',
        description: 'Performs canary or blue-green deployment rollouts with automatic rollback.',
        contentTypes: ['application/json', 'application/x-yaml'],
      },
      {
        name: 'scale_workload',
        description: 'Adjusts replica counts based on load metrics or manual configuration.',
        contentTypes: ['application/json'],
      },
      {
        name: 'diagnose_incident',
        description: 'Analyzes cluster state, logs, and metrics to identify root cause of incidents.',
        contentTypes: ['application/json'],
      },
      {
        name: 'audit_security',
        description: 'Runs CIS benchmark checks and RBAC policy validation on the cluster.',
        contentTypes: ['application/json'],
      },
    ],
    capabilities: {
      streaming: true,
      pushNotifications: true,
      extendedAgentCard: true,
    },
    securitySchemes: {
      bearer: { type: 'http', scheme: 'bearer' },
      mtls: { type: 'http', scheme: 'mutual-tls', description: 'Mutual TLS client certificate' },
    },
    security: ['bearer', 'mtls'],
    interfaces: [
      { type: 'jsonrpc', url: 'https://ops.example.com/k8s-agent/rpc' },
      { type: 'grpc', url: 'https://ops.example.com/k8s-agent/grpc' },
    ],
    status: 'online',
    lastChecked: '2026-03-03T10:32:00Z',
    tags: ['devops', 'kubernetes', 'infrastructure', 'monitoring'],
  },
  {
    id: 'agent-content-writer',
    name: 'Content Writer',
    description:
      'Generates blog posts, documentation, marketing copy, and technical articles. Supports multiple tone styles, SEO optimization, and multi-language output.',
    url: 'https://content.example.com/writer',
    version: '2.0.0',
    provider: {
      name: 'ContentAI Labs',
      url: 'https://contentai.example.com',
    },
    skills: [
      {
        name: 'write_article',
        description: 'Generates a structured article from a topic outline or brief.',
        contentTypes: ['text/markdown', 'text/html', 'text/plain'],
      },
      {
        name: 'optimize_seo',
        description: 'Analyzes and enhances content for search engine optimization.',
        contentTypes: ['application/json'],
      },
    ],
    capabilities: {
      streaming: true,
      pushNotifications: false,
      extendedAgentCard: false,
    },
    status: 'offline',
    lastChecked: '2026-03-03T09:15:00Z',
    tags: ['content', 'writing', 'marketing'],
  },
  {
    id: 'agent-test-runner',
    name: 'Test Runner',
    description:
      'Orchestrates test execution across unit, integration, and end-to-end test suites. Provides intelligent test selection based on code changes and historical failure patterns.',
    url: 'https://ci.example.com/test-runner',
    version: '1.5.3',
    provider: {
      name: 'DevTools Corp',
      url: 'https://devtools.example.com',
      contactEmail: 'support@devtools.example.com',
    },
    skills: [
      {
        name: 'run_tests',
        description: 'Executes selected test suites and returns structured results.',
        contentTypes: ['application/json'],
      },
      {
        name: 'select_tests',
        description: 'Uses code diff analysis to identify the minimal set of tests to run.',
        contentTypes: ['application/json'],
      },
      {
        name: 'analyze_flaky',
        description: 'Identifies flaky tests from historical run data and suggests fixes.',
        contentTypes: ['application/json'],
      },
    ],
    capabilities: {
      streaming: true,
      pushNotifications: true,
      extendedAgentCard: false,
    },
    securitySchemes: {
      bearer: { type: 'http', scheme: 'bearer' },
    },
    security: ['bearer'],
    status: 'online',
    lastChecked: '2026-03-03T10:31:00Z',
    tags: ['testing', 'ci-cd', 'development'],
  },
  {
    id: 'agent-translation',
    name: 'Translation Service',
    description:
      'Provides high-quality machine translation across 40+ language pairs with domain-specific glossary support and translation memory integration.',
    url: 'https://lang.example.com/translate',
    version: '5.2.0',
    provider: {
      name: 'LinguaAI',
      url: 'https://linguaai.example.com',
      contactEmail: 'api@linguaai.example.com',
    },
    skills: [
      {
        name: 'translate_text',
        description: 'Translates text between supported language pairs.',
        contentTypes: ['text/plain', 'text/html', 'application/json'],
      },
      {
        name: 'detect_language',
        description: 'Identifies the language of input text with confidence scores.',
        contentTypes: ['text/plain'],
      },
    ],
    capabilities: {
      streaming: false,
      pushNotifications: false,
      extendedAgentCard: true,
    },
    securitySchemes: {
      apiKey: { type: 'apiKey', in: 'header', name: 'Authorization' },
    },
    security: ['apiKey'],
    status: 'unknown',
    lastChecked: '2026-03-02T22:00:00Z',
    tags: ['language', 'translation', 'internationalization'],
  },
  {
    id: 'agent-image-analyzer',
    name: 'Image Analyzer',
    description:
      'Performs image classification, object detection, OCR, and visual question answering. Supports batch processing and integrates with common storage backends (S3, GCS, Azure Blob).',
    url: 'https://vision.example.com/analyzer',
    version: '3.0.1',
    provider: {
      name: 'VisionTech',
      url: 'https://visiontech.example.com',
    },
    skills: [
      {
        name: 'classify_image',
        description: 'Classifies images into predefined or custom categories.',
        contentTypes: ['image/png', 'image/jpeg', 'image/webp'],
      },
      {
        name: 'detect_objects',
        description: 'Detects and localizes objects within images with bounding boxes.',
        contentTypes: ['image/png', 'image/jpeg'],
      },
      {
        name: 'extract_text',
        description: 'Performs OCR to extract text from images and documents.',
        contentTypes: ['image/png', 'image/jpeg', 'application/pdf'],
      },
    ],
    capabilities: {
      streaming: false,
      pushNotifications: true,
      extendedAgentCard: false,
    },
    securitySchemes: {
      oauth2: { type: 'oauth2', description: 'OAuth 2.0 client credentials' },
    },
    security: ['oauth2'],
    interfaces: [{ type: 'jsonrpc' }],
    status: 'online',
    lastChecked: '2026-03-03T10:29:00Z',
    tags: ['vision', 'ml', 'ocr', 'image-processing'],
  },
  {
    id: 'agent-db-query',
    name: 'Database Query Agent',
    description:
      'Converts natural language questions into optimized SQL queries. Supports PostgreSQL, MySQL, and SQLite with query plan analysis and index recommendations.',
    url: 'https://data-agents.example.com/db-query',
    version: '1.2.0',
    provider: {
      name: 'DataFlow Inc',
      url: 'https://dataflow.example.com',
      contactEmail: 'agents@dataflow.example.com',
    },
    skills: [
      {
        name: 'natural_to_sql',
        description: 'Translates a natural language question into an executable SQL query.',
        contentTypes: ['application/json', 'text/plain'],
      },
      {
        name: 'optimize_query',
        description: 'Analyzes a SQL query plan and suggests optimizations.',
        contentTypes: ['application/json'],
      },
    ],
    capabilities: {
      streaming: false,
      pushNotifications: false,
      extendedAgentCard: false,
    },
    securitySchemes: {
      apiKey: { type: 'apiKey', in: 'header', name: 'X-DB-Agent-Key' },
    },
    security: ['apiKey'],
    status: 'online',
    lastChecked: '2026-03-03T10:27:00Z',
    tags: ['database', 'sql', 'data'],
  },
  {
    id: 'agent-doc-search',
    name: 'Documentation Search',
    description:
      'Semantic search across technical documentation, API references, and knowledge bases. Supports RAG (Retrieval-Augmented Generation) for contextual answers with source citations.',
    url: 'https://knowledge.example.com/doc-search',
    version: '2.1.4',
    provider: {
      name: 'KnowledgeBase AI',
      url: 'https://kbai.example.com',
    },
    skills: [
      {
        name: 'semantic_search',
        description: 'Performs vector-based semantic search across indexed documentation.',
        contentTypes: ['application/json', 'text/plain'],
      },
      {
        name: 'answer_question',
        description: 'Generates an answer to a question using retrieved documentation context.',
        contentTypes: ['application/json', 'text/markdown'],
      },
      {
        name: 'index_documents',
        description: 'Indexes new documents for future search and retrieval.',
        contentTypes: ['application/json', 'text/markdown', 'application/pdf'],
      },
    ],
    capabilities: {
      streaming: true,
      pushNotifications: false,
      extendedAgentCard: true,
    },
    securitySchemes: {
      bearer: { type: 'http', scheme: 'bearer' },
    },
    security: ['bearer'],
    interfaces: [
      { type: 'jsonrpc', url: 'https://knowledge.example.com/doc-search/rpc' },
    ],
    status: 'online',
    lastChecked: '2026-03-03T10:33:00Z',
    tags: ['search', 'documentation', 'rag', 'knowledge'],
  },
  {
    id: 'agent-workflow-engine',
    name: 'Workflow Orchestrator',
    description:
      'Coordinates multi-agent workflows with conditional branching, parallel execution, retry logic, and human-in-the-loop approval gates. Persists workflow state for long-running processes.',
    url: 'https://orchestration.example.com/workflow',
    version: '1.0.0-beta',
    provider: {
      name: 'AgentMesh',
      url: 'https://agentmesh.example.com',
      contactEmail: 'hello@agentmesh.example.com',
    },
    skills: [
      {
        name: 'create_workflow',
        description: 'Creates a new workflow definition from a DAG specification.',
        contentTypes: ['application/json'],
      },
      {
        name: 'execute_workflow',
        description: 'Starts execution of a defined workflow with provided inputs.',
        contentTypes: ['application/json'],
      },
      {
        name: 'get_workflow_status',
        description: 'Returns the current state and progress of a running workflow.',
        contentTypes: ['application/json'],
      },
    ],
    capabilities: {
      streaming: true,
      pushNotifications: true,
      extendedAgentCard: true,
    },
    securitySchemes: {
      bearer: { type: 'http', scheme: 'bearer' },
      oauth2: { type: 'oauth2', description: 'OAuth 2.0 for organization access' },
    },
    security: ['bearer'],
    interfaces: [
      { type: 'jsonrpc' },
      { type: 'grpc' },
    ],
    status: 'online',
    lastChecked: '2026-03-03T10:34:00Z',
    tags: ['orchestration', 'workflow', 'multi-agent'],
  },
  {
    id: 'agent-log-analyzer',
    name: 'Log Analyzer',
    description:
      'Ingests and analyzes application logs to detect anomalies, extract patterns, and correlate events across distributed services. Supports structured and unstructured log formats.',
    url: 'https://ops.example.com/log-analyzer',
    version: '2.3.0',
    provider: {
      name: 'CloudOps Platform',
      url: 'https://cloudops.example.com',
      contactEmail: 'devops@cloudops.example.com',
    },
    skills: [
      {
        name: 'detect_anomalies',
        description: 'Uses statistical models to identify anomalous log patterns.',
        contentTypes: ['application/json', 'text/plain'],
      },
      {
        name: 'correlate_events',
        description: 'Correlates events across services using trace IDs and timestamps.',
        contentTypes: ['application/json'],
      },
    ],
    capabilities: {
      streaming: true,
      pushNotifications: true,
      extendedAgentCard: false,
    },
    securitySchemes: {
      bearer: { type: 'http', scheme: 'bearer' },
    },
    security: ['bearer'],
    status: 'offline',
    lastChecked: '2026-03-03T08:00:00Z',
    tags: ['monitoring', 'logs', 'observability', 'devops'],
  },
];
