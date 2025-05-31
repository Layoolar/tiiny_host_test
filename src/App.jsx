import { useState } from 'react';
import CSVUploader from './CSVUploader';
import DataGrid from './DataGrid';

export default function App() {
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);

  const handleCSVData = (parsedData) => {
    setHeaders(parsedData[0]);
    setData(parsedData.slice(1));
  };

  return (
    <div style={{width:"100%"}}>
      <CSVUploader onDataParsed={handleCSVData} />
      {data.length > 0 && <DataGrid headers={headers} data={data} />}
    </div>
  );
}
