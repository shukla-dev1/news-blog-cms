import React, { useState, useRef } from 'react';
// import { Layout, BaseHeaderLayout, ContentLayout } from '@strapi/design-system';
import { Box, Button, Typography, Flex } from '@strapi/design-system';


type BulkUploadSummary = {
  createdCount: number;
  updatedCount: number;
  errorCount: number;
  errors: Array<{ row: number; message: string }>;
};

const BulkBlogUploadPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [summary, setSummary] = useState<BulkUploadSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
      setSummary(null);
      setError(null);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/blogs/bulk-template');

      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'blog-bulk-upload-template.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message ?? 'Unable to download template');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select an Excel file first');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSummary(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/blogs/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Bulk upload failed');
      }

      const data = (await response.json()) as BulkUploadSummary;
      setSummary(data);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(err?.message ?? 'Bulk upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Box>
      {/* <BaseHeaderLayout
        title="Bulk blog upload"
        subtitle="Upload an Excel file to create or update multiple blog posts at once. Download the template first to ensure the correct format."
        as="h1"
      /> */}
      <Box >
        <Box padding={6} background="neutral0" shadow="filterShadow" hasRadius>
          <Flex direction="column" alignItems="stretch" gap={4}>
            <Flex justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="omega" fontWeight="bold">
                  Excel template
                </Typography>
                <Typography textColor="neutral600">
                  Use the template to see the expected columns and some sample rows.
                </Typography>
              </Box>
              <Button variant="secondary" onClick={handleDownloadTemplate}>
                Download template
              </Button>
            </Flex>

            <Box marginTop={4}>
              <Typography variant="omega" fontWeight="bold">
                Upload file
              </Typography>
              <Box marginTop={2}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  aria-label="Bulk blog upload Excel file"
                />
              </Box>
              <Typography textColor="neutral600" marginTop={1}>
                The file should be an Excel workbook with the header row from the template. Leave
                <code> id </code>
                empty to create new posts, or fill it to update existing ones.
              </Typography>
            </Box>

            <Flex gap={2} marginTop={4}>
              <Button onClick={handleUpload} loading={isUploading} disabled={!file || isUploading}>
                Start bulk upload
              </Button>
            </Flex>

            {error && (
              <Box marginTop={4}>
                <Typography textColor="danger600">{error}</Typography>
              </Box>
            )}

            {summary && (
              <Box marginTop={4}>
                <Typography variant="omega" fontWeight="bold">
                  Upload summary
                </Typography>
                <Box marginTop={1}>
                  <Typography textColor="neutral800">
                    Created: {summary.createdCount} &nbsp;|&nbsp; Updated: {summary.updatedCount}
                    &nbsp;|&nbsp; Errors: {summary.errorCount}
                  </Typography>
                </Box>
                {summary.errors && summary.errors.length > 0 && (
                  <Box marginTop={2}>
                    <Typography textColor="danger600">
                      Rows with issues:
                    </Typography>
                    {summary.errors.map((rowError) => (
                      <Typography key={rowError.row} textColor="danger600">
                        Row {rowError.row}: {rowError.message}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </Flex>
        </Box>
      </Box>
    </Box>
  );
};

export default BulkBlogUploadPage;

