import React, { useState } from 'react';
import { useReports } from '../hooks/useReports';
import { FileText, Clock, Download, UploadCloud, Trash2, Store } from 'lucide-react';

const Reports = () => {
  const { reports, updateReportStatus, deleteReport } = useReports();
  const [isSyncing, setIsSyncing] = useState(false);

  // ... (getStatusIcon / getStatusText remain unchanged)
  const getStatusIcon = (status) => {
    switch (status) {
      case 'synced':
        return <span className="text-green-500 font-bold text-base px-1">V</span>;
      case 'error':
      case 'error (no config)':
        return <span className="text-red-500 font-bold text-base px-1">X</span>;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'synced':
        return '已同步 (Google Sheets)';
      case 'error':
        return '同步失敗';
      case 'error (no config)':
        return '未設定連線';
      default:
        return '等待同步...';
    }
  };

  // Group reports by date string (e.g., '2023/10/27')
  const groupedReports = reports.reduce((acc, report) => {
    const dateStr = new Date(report.date).toLocaleDateString('zh-TW');
    if (!acc[dateStr]) acc[dateStr] = { items: [], total: 0 };
    acc[dateStr].items.push(report);
    acc[dateStr].total += report.totalAmount;
    return acc;
  }, {});

  const handleDownloadCSV = (dateStr, dayData) => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // BOM for Excel
    csvContent += "時間,訂單編號,項目,數量,金額\n"; // Updated columns per user request

    dayData.items.forEach(report => {
      const time = new Date(report.date).toLocaleTimeString('zh-TW');
      report.items.forEach(item => {
        const subtotal = item.price * item.quantity;
        // Escape quotes to prevent CSV breakage
        const safeName = `"${item.name.replace(/"/g, '""')}"`;
        // Requested format: Time, OrderID, Item, Qty, Amount
        csvContent += `${time},${report.orderId},${safeName},${item.quantity},${subtotal}\n`;
      });
    });

    csvContent += `\n,,,,總計: ${dayData.total}\n`;

    // Filename timestamp and serial number (using the first order ID of the day as reference)
    const firstOrderId = dayData.items[dayData.items.length - 1]?.orderId || '0000';
    const filename = `收銀紀錄_${dateStr.replace(/\//g, '')}_${firstOrderId}.csv`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleManualSync = async () => {
    const unsyncedReports = reports.filter(r => r.status !== 'synced');
    if (unsyncedReports.length === 0) {
      alert('所有紀錄皆已同步！');
      return;
    }

    const gasUrl = import.meta.env.VITE_GOOGLE_APP_SCRIPT_URL;
    if (!gasUrl) {
      alert('尚未設定 Google Apps Script 網址 (VITE_GOOGLE_APP_SCRIPT_URL)');
      return;
    }

    setIsSyncing(true);
    let successCount = 0;

    for (const report of unsyncedReports) {
      try {
        await fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report)
        });
        updateReportStatus(report.id, 'synced');
        successCount++;
      } catch (error) {
        console.error('Sync error for report', report.id, error);
        updateReportStatus(report.id, 'error');
      }
    }

    setIsSyncing(false);
    alert(`手動同步完成！成功同步 ${successCount} 筆，失敗 ${unsyncedReports.length - successCount} 筆。`);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 pb-16">
      <div className="bg-white px-4 pt-4 pb-4 shadow-sm border-b border-gray-100 z-10 sticky top-0 flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Store className="w-6 h-6 text-blue-600" />
            收銀與交易紀錄
          </h1>
          <p className="text-xs text-gray-500 mt-1">此處顯示本機的收銀紀錄與雲端同步狀態</p>
        </div>
        
        {/* Manual Sync Button */}
        <button 
          onClick={handleManualSync}
          disabled={isSyncing}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all shadow-sm
            ${isSyncing 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-green-50 text-green-600 hover:bg-green-100 active:scale-95 border border-green-200'
            }`}
        >
          <UploadCloud className={`w-4 h-4 ${isSyncing ? 'animate-pulse' : ''}`} />
          {isSyncing ? '同步中...' : '手動同步上傳'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {Object.entries(groupedReports).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedReports).sort((a,b) => new Date(b[0]) - new Date(a[0])).map(([dateStr, dayData]) => (
              <div key={dateStr} className="space-y-4">
                {/* Day Header & Download Button */}
                <div className="flex justify-between items-end border-b-2 border-blue-100 pb-2">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">{dateStr}</h2>
                    <div className="text-sm text-gray-500 font-medium mt-1">單日總額: <span className="text-blue-600 font-bold">${dayData.total}</span></div>
                  </div>
                  <button 
                    onClick={() => handleDownloadCSV(dateStr, dayData)}
                    className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-100 active:scale-95 transition-all"
                  >
                    <Download className="w-4 h-4" /> 下載紀錄
                  </button>
                </div>

                {/* Reports for the day */}
                <div className="space-y-3">
                  {dayData.items.map((report) => (
                    <div key={report.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative">
                      {/* V / X Status Indicator */}
                      <div className="absolute top-4 right-4 flex flex-col items-end">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-400">{getStatusText(report.status)}</span>
                          {getStatusIcon(report.status)}
                        </div>
                      </div>

                      <div className="mb-3 pr-24">
                        <div className="font-bold text-gray-900 text-sm">{report.orderId}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {new Date(report.date).toLocaleTimeString('zh-TW')}
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                        {report.items.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="text-gray-700">{item.name} <span className="text-gray-400 font-medium">x{item.quantity}</span></span>
                            <span className="font-medium text-gray-900">${item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex justify-between items-center">
                        <button 
                          onClick={() => {
                            if (window.confirm('確定要刪除這筆交易紀錄嗎？（此動作無法還原）')) {
                              deleteReport(report.id);
                            }
                          }}
                          className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" /> 刪除
                        </button>
                        <div>
                          <span className="text-sm text-gray-500 mr-2">總計</span>
                          <span className="font-bold text-lg text-blue-600">${report.totalAmount}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <Store className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">目前沒有任何交易紀錄</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
