
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  onPageChange: (newPage: number) => void;
  className?: string;
}

export function PaginationComponent({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  className = '',
}: PaginationProps) {
  const isFirst = currentPage <= 1;
  const isLast = currentPage >= totalPages;

  return (
    <div className={`flex flex-col sm:flex-row items-center w-full justify-between gap-3 pt-4 border-t border-slate-200/80 ${className}`}>
      {/* Current Page Indicator */}
      <p aria-live="polite" className="text-xs sm:text-sm text-slate-700 font-medium">
        Page <span className="font-bold text-[#0f172a]">{currentPage}</span> of{' '}
        <span className="font-bold text-[#0f172a]">{totalPages}</span>
        {typeof totalItems === 'number' && (
          <span className="ml-2 text-xs text-[#2563eb] font-bold">
            ({totalItems} total {totalItems === 1 ? 'record' : 'records'})
          </span>
        )}
      </p>

      {/* Pagination Controls */}
      <div className="flex items-center gap-2">
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => {
            if (!isFirst) {
              onPageChange(currentPage - 1);
            }
          }}
          disabled={isFirst}
          aria-disabled={isFirst}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
            isFirst
              ? 'opacity-40 border-slate-200 text-slate-400 cursor-not-allowed bg-slate-50'
              : 'border-slate-200/80 text-slate-800 bg-white hover:bg-slate-50 hover:border-[#2563eb] hover:text-[#2563eb] active:scale-[0.98] shadow-xs hover:shadow-sm'
          }`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>Previous</span>
        </button>

        {/* Next Button */}
        <button
          type="button"
          onClick={() => {
            if (!isLast) {
              onPageChange(currentPage + 1);
            }
          }}
          disabled={isLast}
          aria-disabled={isLast}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
            isLast
              ? 'opacity-40 border-slate-200 text-slate-400 cursor-not-allowed bg-slate-50'
              : 'border-slate-200/80 text-slate-800 bg-white hover:bg-slate-50 hover:border-[#2563eb] hover:text-[#2563eb] active:scale-[0.98] shadow-xs hover:shadow-sm'
          }`}
        >
          <span>Next</span>
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default PaginationComponent;