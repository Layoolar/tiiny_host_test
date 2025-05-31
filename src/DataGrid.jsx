import { useState, useRef, useEffect, useMemo } from 'react';

const ROW_HEIGHT = 35;
const BUFFER_ROWS = 10;

const MIN_COLUMN_WIDTH = 100;
const MAX_COLUMN_WIDTH = 500;

export default function DataGrid({ headers, data, onDataChange }) {
  const cleanedHeaders = useMemo(() => {
    if (!headers) return [];
    return headers.map(header => 
      typeof header === 'string' ? header.trim() : String(header).trim()
    );
  }, [headers]);
  
  const [sortConfig, setSortConfig] = useState({ column: null, direction: null });
  const [selectedColumn, setSelectedColumn] = useState(null);
  const containerRef = useRef(null);
  const headerScrollRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(500);
  const [columnWidths, setColumnWidths] = useState(() => 
    cleanedHeaders.reduce((acc, _, index) => {
      acc[index] = MIN_COLUMN_WIDTH;
      return acc;
    }, {})
  );
  const [isResizing, setIsResizing] = useState(false);
  const [resizingColumn, setResizingColumn] = useState(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef(null);

  const isNumeric = (value) => {
    if (value === null || value === undefined || value === '') return false;
    const num = Number(value);
    return !isNaN(num) && isFinite(num);
  };

  const totalTableWidth = cleanedHeaders.reduce((total, _, index) => {
    return total + columnWidths[index];
  }, 0);

  // Memoized sorting optimization: prevents expensive sort operations on every render
  // Only recalculates when data, sortConfig, or headers change
  const sortedData = useMemo(() => {
    if (!sortConfig.column) return data;
    const index = cleanedHeaders.indexOf(sortConfig.column);
    const sorted = [...data].sort((a, b) => {
      const valA = a[index];
      const valB = b[index];

      if (!isNaN(valA) && !isNaN(valB)) {
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }

      return sortConfig.direction === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    return sorted;
  }, [data, sortConfig, cleanedHeaders]);

  // Virtual scrolling optimization: only render visible rows + buffer to handle large datasets
  // Calculates which rows are currently visible based on scroll position and container height
  const totalHeight = sortedData.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS);
  const endIndex = Math.min(sortedData.length, startIndex + Math.ceil(containerHeight / ROW_HEIGHT) + 2 * BUFFER_ROWS);
  const visibleRows = sortedData.slice(startIndex, endIndex);

  const handleScroll = () => {
    const scrollTop = containerRef.current.scrollTop;
    const scrollLeft = containerRef.current.scrollLeft;
    
    setScrollTop(scrollTop);
    
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = scrollLeft;
    }
  };

  const handleResize = () => {
    setContainerHeight(containerRef.current.clientHeight);
  };

  const handleSort = (direction) => {
    if (!selectedColumn) return;
    setSortConfig({ column: selectedColumn, direction });
  };

  const handleColumnSelect = (header) => {
    setSelectedColumn(header);
  };

  const startResize = (e, index) => {
    setIsResizing(true);
    setResizingColumn(index);
    setStartX(e.clientX);
    setStartWidth(columnWidths[index]);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const doResize = (e) => {
    if (!isResizing || resizingColumn === null) return;
    const newWidth = Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, startWidth + e.clientX - startX));
    setColumnWidths(prev => ({
      ...prev,
      [resizingColumn]: newWidth
    }));
  };

  const stopResize = () => {
    setIsResizing(false);
    setResizingColumn(null);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  const startEdit = (rowIndex, colIndex, currentValue) => {
    setEditingCell({ row: rowIndex, col: colIndex });
    setEditValue(String(currentValue || ''));
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const saveEdit = () => {
    if (!editingCell) return;
    
    const { row, col } = editingCell;
    const newData = [...data];
    
    let processedValue = editValue;
    if (isNumeric(editValue)) {
      processedValue = Number(editValue);
    }
    
    newData[row][col] = processedValue;
    
    if (onDataChange) {
      onDataChange(newData);
    }
    
    setEditingCell(null);
    setEditValue('');
  };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  const handleEditChange = (e) => {
    setEditValue(e.target.value);
  };

  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCell]);

  // Event listener cleanup optimization: prevents memory leaks and performance degradation
  // Properly removes all event listeners when component unmounts or dependencies change
  // Conditionally adds resize listeners only when actively resizing to reduce overhead
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    container.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    
    if (isResizing) {
      window.addEventListener('mousemove', doResize);
      window.addEventListener('mouseup', stopResize);
    }
    
    handleResize();
    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', doResize);
      window.removeEventListener('mouseup', stopResize);
    };
  }, [isResizing]);

  return (
    <div className="datagrid-container">
      <div className="datagrid-controls">
        <div className="datagrid-controls-main">
          <select 
            value={selectedColumn || ''} 
            onChange={(e) => handleColumnSelect(e.target.value)}
            className="datagrid-select"
          >
            <option value="">Select column to sort</option>
            {cleanedHeaders.map((header, i) => (
              <option key={i} value={header}>{header}</option>
            ))}
          </select>
          <button 
            onClick={() => handleSort('asc')}
            disabled={!selectedColumn}
            className={`datagrid-button ${
              sortConfig.direction === 'asc' && sortConfig.column === selectedColumn ? 'active' : ''
            }`}
          >
            Sort Ascending ↑
          </button>
          <button 
            onClick={() => handleSort('desc')}
            disabled={!selectedColumn}
            className={`datagrid-button ${
              sortConfig.direction === 'desc' && sortConfig.column === selectedColumn ? 'active' : ''
            }`}
          >
            Sort Descending ↓
          </button>
          <button 
            onClick={() => setSortConfig({ column: null, direction: null })}
            className="datagrid-button secondary"
          >
            Clear Sort
          </button>
        </div>
        
        <div className="datagrid-legend">
          <div className="datagrid-legend-item">
            <div className="datagrid-legend-color numeric"></div>
            <span>Numbers</span>
          </div>
          <div className="datagrid-legend-item">
            <div className="datagrid-legend-color text"></div>
            <span>Text</span>
          </div>
          <div className="datagrid-legend-tip">
            💡 Double-click cells to edit
          </div>
        </div>
      </div>

      <div className="datagrid-table-container">
        <div ref={headerScrollRef} className="datagrid-header">
          <div 
            className="datagrid-header-content"
            style={{ width: totalTableWidth }}
          >
            {cleanedHeaders.map((header, i) => (
              <div
                key={i}
                className={`datagrid-header-cell ${
                  sortConfig.column === header ? 'sorted' : ''
                }`}
                style={{ width: columnWidths[i] }}
              >
                <div className="datagrid-header-text">
                  {header}
                </div>
                <div
                  className={`datagrid-resize-handle ${
                    isResizing && resizingColumn === i ? 'active' : ''
                  }`}
                  onMouseDown={(e) => startResize(e, i)}
                />
              </div>
            ))}
          </div>
        </div>

        <div ref={containerRef} className="datagrid-content">
          <div 
            className="datagrid-content-inner"
            style={{ 
              height: totalHeight, 
              width: totalTableWidth 
            }}
          >
            {visibleRows.map((row, i) => {
              const actualIndex = Math.max(0, startIndex) + i;
              return (
                <div
                  key={actualIndex}
                  className="datagrid-row"
                  style={{
                    top: actualIndex * ROW_HEIGHT,
                    width: totalTableWidth
                  }}
                >
                  {row.map((cell, j) => {
                    const header = cleanedHeaders[j];
                    const isNumericCell = isNumeric(cell);
                    const displayValue = header && header.toLowerCase().includes('date')
                      ? new Date(cell).toLocaleDateString()
                      : cell;
                    
                    const isEditing = editingCell && editingCell.row === actualIndex && editingCell.col === j;
                    
                    return (
                      <div
                        key={j}
                        className={`datagrid-cell ${
                          isEditing ? 'editing' : ''
                        } ${isNumericCell ? 'numeric' : 'text'}`}
                        style={{ width: columnWidths[j] }}
                        onDoubleClick={() => startEdit(actualIndex, j, cell)}
                      >
                        {isEditing ? (
                          <input
                            ref={editInputRef}
                            value={editValue}
                            onChange={handleEditChange}
                            onKeyDown={handleEditKeyDown}
                            onBlur={saveEdit}
                            autoComplete="off"
                            spellCheck="false"
                            className={`datagrid-edit-input ${
                              isNumericCell ? 'numeric' : 'text'
                            }`}
                          />
                        ) : (
                          <span className="datagrid-cell-content">
                            {displayValue}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}