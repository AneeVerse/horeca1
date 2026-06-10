'use client';

/**
 * VendorProductImportModal — thin wrapper over the shared ProductImportModal,
 * pre-configured for the vendor portal (session-resolved vendor; no vendor
 * selector). The UI/logic lives in features/shared/ProductImportModal so admin
 * and vendor imports can never drift apart.
 */

import SharedProductImportModal from '@/components/features/shared/ProductImportModal';

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function VendorProductImportModal({ open, onClose, onComplete }: Props) {
  return (
    <SharedProductImportModal
      open={open}
      onClose={onClose}
      onComplete={onComplete}
      config={{
        importEndpoint: '/api/v1/vendor/products/import',
        templateUrl: '/api/v1/vendor/products/import?template=true',
        productPatchBase: '/api/v1/vendor/products',
        categoriesEndpoint: '/api/v1/categories',
      }}
    />
  );
}
