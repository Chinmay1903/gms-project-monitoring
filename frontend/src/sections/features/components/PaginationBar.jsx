import React from "react";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";

/**
 * Reusable pagination bar (Material UI).
 *
 * Props:
 * - page: current page (1-based)
 * - count: total number of pages
 * - onChange: (newPage:number) => void
 * - className: optional
 */
export default function PaginationBar({ page, count, onChange, className = "" }) {
  return (
    <div className={`d-flex justify-content-center ${className}`}>
      <Stack spacing={2}>
        <Pagination
          count={count}
          page={page}
          variant="outlined"
          shape="rounded"
          color="info"
          showFirstButton
          showLastButton
          onChange={(_, value) => onChange(value)}
        />
      </Stack>
    </div>
  );
}
