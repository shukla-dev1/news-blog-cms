import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Flex } from '@strapi/design-system';

type CollectionOption = {
  uid: string;
  displayName: string;
};

type ImportSummary = {
  createdCount: number;
  errorCount: number;
  created: Array<{ index: number; id: number }>;
  errors: Array<{ index: number; message: string }>;
};

const BulkJsonImportPage = () => {
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [selectedUid, setSelectedUid] = useState('');
  const [jsonText, setJsonText] = useState('[\n  \n]');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCollections, setIsLoadingCollections] = useState(true);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoadingCollections(true);
      setLoadError(null);
      try {
        const response = await fetch('/api/bulk-json/collections');
        if (!response.ok) {
          throw new Error('Failed to load collections');
        }
        const data = (await response.json()) as { collections: CollectionOption[] };
        if (!cancelled) {
          setCollections(data.collections ?? []);
          if (data.collections?.length && data.collections[0]) {
            setSelectedUid(data.collections[0].uid);
          }
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load collections');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCollections(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleImport = async () => {
    if (!selectedUid) {
      setError('Select a collection');
      return;
    }

    let items: unknown;
    try {
      items = JSON.parse(jsonText);
    } catch {
      setError('Invalid JSON');
      return;
    }

    if (!Array.isArray(items)) {
      setError('JSON must be an array of objects');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSummary(null);

    try {
      const response = await fetch('/api/bulk-json/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: selectedUid, items }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Import failed');
      }

      const data = (await response.json()) as ImportSummary;
      setSummary(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box>
      <Box padding={6} background="neutral0" shadow="filterShadow" hasRadius>
        <Flex direction="column" alignItems="stretch" gap={4}>
          <Box>
            <Typography variant="omega" fontWeight="bold">
              Bulk JSON import
            </Typography>
            <Typography textColor="neutral600">
              Choose a collection and paste a JSON array. Each object is one entry (same shape as
              the REST API <code>data</code> payload).
            </Typography>
          </Box>

          {loadError && (
            <Typography textColor="danger600">{loadError}</Typography>
          )}

          <Box>
            <Typography variant="omega" fontWeight="bold">
              Collection
            </Typography>
            <Box marginTop={2}>
              <select
                value={selectedUid}
                onChange={(e) => setSelectedUid(e.target.value)}
                disabled={isLoadingCollections || collections.length === 0}
                aria-label="Target collection"
                style={{
                  minWidth: '280px',
                  padding: '8px 10px',
                  fontSize: '14px',
                  borderRadius: '4px',
                  border: '1px solid #dcdce4',
                }}
              >
                {collections.length === 0 && !isLoadingCollections ? (
                  <option value="">No collections</option>
                ) : (
                  collections.map((c) => (
                    <option key={c.uid} value={c.uid}>
                      {c.displayName} ({c.uid})
                    </option>
                  ))
                )}
              </select>
            </Box>
          </Box>

          <Box>
            <Typography variant="omega" fontWeight="bold">
              JSON array
            </Typography>
            <Typography textColor="neutral600" marginTop={1}>
              Example: <code>[{`{"title":"A","price":10}`}]</code> — for draft and publish types,
              add <code>publishedAt</code> if you need published entries.
            </Typography>
            <Box marginTop={2}>
              <textarea
                name="bulk-json-array"
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                aria-label="JSON array to import"
                style={{
                  width: '100%',
                  minHeight: '220px',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  padding: '10px 12px',
                  borderRadius: '4px',
                  border: '1px solid #dcdce4',
                  boxSizing: 'border-box',
                }}
              />
            </Box>
          </Box>

          <Flex gap={2} marginTop={2}>
            <Button
              onClick={handleImport}
              loading={isLoading}
              disabled={isLoading || !selectedUid || isLoadingCollections}
            >
              Import
            </Button>
          </Flex>

          {error && (
            <Box marginTop={2}>
              <Typography textColor="danger600">{error}</Typography>
            </Box>
          )}

          {summary && (
            <Box marginTop={4}>
              <Typography variant="omega" fontWeight="bold">
                Result
              </Typography>
              <Box marginTop={1}>
                <Typography textColor="neutral800">
                  Created: {summary.createdCount} &nbsp;|&nbsp; Errors: {summary.errorCount}
                </Typography>
              </Box>
              {summary.created.length > 0 && (
                <Box marginTop={2}>
                  <Typography textColor="neutral600">Created entries:</Typography>
                  {summary.created.map((row) => (
                    <Typography key={`c-${row.index}-${row.id}`} textColor="neutral800">
                      Index {row.index}: id {row.id}
                    </Typography>
                  ))}
                </Box>
              )}
              {summary.errors.length > 0 && (
                <Box marginTop={2}>
                  <Typography textColor="danger600">Errors:</Typography>
                  {summary.errors.map((rowError) => (
                    <Typography key={`e-${rowError.index}`} textColor="danger600">
                      Index {rowError.index}: {rowError.message}
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </Flex>
      </Box>
    </Box>
  );
};

export default BulkJsonImportPage;
