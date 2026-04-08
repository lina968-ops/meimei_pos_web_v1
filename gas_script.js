// Google Apps Script for React POS App
// 請將此程式碼貼上到 Google Apps Script，並部署為「網頁應用程式」

const INVENTORY_SHEET_NAME = 'Inventory';

function getSheet(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (sheetName === INVENTORY_SHEET_NAME) {
      sheet.appendRow(['id', 'name', 'category', 'price', 'stock', 'image', 'discounts']);
      sheet.getRange('A1:G1').setFontWeight('bold').setBackground('#f3f3f3');
    }
  }
  return sheet;
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    
    if (action === 'get_inventory') {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = getSheet(ss, INVENTORY_SHEET_NAME);
      const data = sheet.getDataRange().getValues();
      
      const items = [];
      for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row[0]) continue; // Skip empty rows
          
          let discounts = [];
          try {
              discounts = JSON.parse(row[6]);
          } catch (err) {
              discounts = [];
          }

          items.push({
              id: row[0].toString(),
              name: row[1],
              category: row[2] || '未分類',
              price: Number(row[3]) || 0,
              stock: Number(row[4]) || 0,
              image: row[5] || null,
              discounts: discounts
          });
      }

      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        items: items 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
        success: false, 
        message: 'Invalid action for GET' 
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      message: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action || 'checkout'; // fallback to checkout for backward compatibility
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === 'checkout') {
      const dateStr = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
      
      let sheet = ss.getSheetByName(dateStr);
      if (!sheet) {
        sheet = ss.insertSheet(dateStr);
        sheet.appendRow(['時間', '訂單編號', '商品明細', '總數量', '總金額']);
        sheet.getRange('A1:E1').setFontWeight('bold').setBackground('#f3f3f3');
        sheet.setColumnWidth(3, 300);
      }

      const timestamp = new Date().toLocaleTimeString('zh-TW');
      const orderId = payload.orderId || `ORD-${Date.now()}`;
      const itemsDetail = payload.items.map(item => `${item.name} x${item.quantity} ($${item.price * item.quantity})`).join('\n');
      
      sheet.appendRow([timestamp, orderId, itemsDetail, payload.totalQuantity, payload.totalAmount]);
      
      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow, 3).setWrap(true);

      // Deduct stock
      const inventorySheet = getSheet(ss, INVENTORY_SHEET_NAME);
      const invData = inventorySheet.getDataRange().getValues();
      payload.items.forEach(cartItem => {
         for (let i = 1; i < invData.length; i++) {
            if (invData[i][0].toString() === cartItem.id) {
               let currentStock = Number(invData[i][4]) || 0;
               let newStock = Math.max(0, currentStock - cartItem.quantity);
               inventorySheet.getRange(i + 1, 5).setValue(newStock); // Column E is stock
               break;
            }
         }
      });

      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Checkout recorded' })).setMimeType(ContentService.MimeType.JSON);
    } 
    else if (action === 'add_inventory') {
      const item = payload.item;
      const sheet = getSheet(ss, INVENTORY_SHEET_NAME);
      sheet.appendRow([
        item.id, 
        item.name, 
        item.category || '未分類', 
        item.price, 
        item.stock, 
        item.image || '', 
        JSON.stringify(item.discounts || [])
      ]);
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Inventory item added' })).setMimeType(ContentService.MimeType.JSON);
    }
    else if (action === 'update_inventory') {
      const item = payload.item;
      const sheet = getSheet(ss, INVENTORY_SHEET_NAME);
      const match = sheet.getRange("A:A").createTextFinder(String(item.id)).matchEntireCell(true).findNext();
      
      if (match) {
        sheet.getRange(match.getRow(), 1, 1, 7).setValues([[
          item.id, item.name, item.category || '未分類', item.price, item.stock, item.image || '', JSON.stringify(item.discounts || [])
        ]]);
        return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Inventory item updated' })).setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Item not found' })).setMimeType(ContentService.MimeType.JSON);
    }
    else if (action === 'delete_inventory') {
      const itemId = payload.id;
      const sheet = getSheet(ss, INVENTORY_SHEET_NAME);
      const match = sheet.getRange("A:A").createTextFinder(String(itemId)).matchEntireCell(true).findNext();
      
      if (match) {
        sheet.deleteRow(match.getRow());
        return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Inventory item deleted' })).setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Item not found' })).setMimeType(ContentService.MimeType.JSON);
    }
    else {
        throw new Error('Invalid action');
    }

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      message: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 處理 CORS 預檢請求
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}
