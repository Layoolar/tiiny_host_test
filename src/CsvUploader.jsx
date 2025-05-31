export default function CSVUploader({ onDataParsed }) {
  
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Handle escaped quotes ("")
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // Found delimiter outside quotes
        result.push(current.trim());
        current = '';
        i++;
      } else {
        // Regular character
        current += char;
        i++;
      }
    }
    
    // Add the last field
    result.push(current.trim());
    return result;
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = () => {
      const lines = reader.result.split('\n').filter(line => line.trim());
      const parsed = lines.map(line => parseCSVLine(line));
      onDataParsed(parsed);
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ 
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      margin: '20px 0' 
    }}>
      <label style={{
        padding: '8px 16px',
        backgroundColor: '#1976d2',
        color: 'white',
        borderRadius: '4px',
        cursor: 'pointer',
        border: 'none',
        fontSize: '16px',
        fontWeight: '500'
      }}>
        Upload CSV
        <input 
          type="file" 
          accept=".csv" 
          onChange={handleUpload}
          style={{ display: 'none' }}
        />
      </label>
    </div>
  );
}