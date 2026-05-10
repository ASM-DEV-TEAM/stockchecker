
    let products = JSON.parse(localStorage.getItem("products")) || [];
    let masterData = JSON.parse(localStorage.getItem("masterData")) || {}; // { barcode: name }
    let searchQuery = "";
    let lastScannedBarcode = "";
    let currentUser = localStorage.getItem("currentUser") || "";

    // User Identification Logic
    function checkAndAskForUserName() {
      if (!currentUser || currentUser.trim() === "") {
        $('#user-modal').modal({
          closable: false,
          onDeny: function() {
            return false; // Prevent closing without entering name
          },
          onApprove: function() {
            const userName = document.getElementById('user-name-input').value.trim();
            if (userName === "") {
              alert('กรุณากรอกชื่อของคุณ');
              return false;
            }
            currentUser = userName;
            localStorage.setItem("currentUser", currentUser);
            updateUserDisplay();
            return true;
          }
        }).modal('show');
        
        // Focus on input field
        setTimeout(() => {
          document.getElementById('user-name-input').focus();
        }, 300);
      } else {
        updateUserDisplay();
      }
    }

    function updateUserDisplay() {
      const userNameElement = document.getElementById('current-user-name');
      if (currentUser) {
        userNameElement.textContent = currentUser;
      } else {
        userNameElement.textContent = 'ไม่ได้ระบุชื่อ';
      }
    }

    function changeUserName() {
      document.getElementById('user-name-input').value = currentUser;
      $('#user-modal').modal({
        closable: true,
        onApprove: function() {
          const userName = document.getElementById('user-name-input').value.trim();
          if (userName === "") {
            alert('กรุณากรอกชื่อของคุณ');
            return false;
          }
          currentUser = userName;
          localStorage.setItem("currentUser", currentUser);
          updateUserDisplay();
          return true;
        }
      }).modal('show');
      
      setTimeout(() => {
        document.getElementById('user-name-input').focus();
      }, 300);
    }

    // Dark Mode Logic
    const darkModeChk = document.getElementById("dark-mode-chk");
    const modeLabel = document.getElementById("mode-label");
    const isDarkMode = localStorage.getItem("darkMode") === "enabled";

    // Initialize Fomantic UI checkbox
    $('.ui.checkbox').checkbox();

    if (isDarkMode) {
      document.body.classList.add("dark-mode");
      darkModeChk.checked = true;
    }

    darkModeChk.addEventListener("change", () => {
      if (darkModeChk.checked) {
        document.body.classList.add("dark-mode");
        localStorage.setItem("darkMode", "enabled");
      } else {
        document.body.classList.remove("dark-mode");
        localStorage.setItem("darkMode", "disabled");
      }
    });

    modeLabel.addEventListener("click", () => {
      darkModeChk.click();
    });

    function formatTime(timestamp) {
      if (!timestamp) return "-";
      const date = new Date(timestamp);
      return date.toLocaleTimeString('th-TH', {
        hour12: false
      }) + " " + date.toLocaleDateString('th-TH');
    }

    function renderList() {
      // Filter based on search query
      const filteredProducts = products.filter(p =>
        p.barcode.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Sort by timestamp (newest first)
      filteredProducts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      const container = document.getElementById("list-body");
      container.innerHTML = "";

      if (filteredProducts.length === 0) {
        container.innerHTML = `<div style="padding: 2.5rem; text-align: center; color: gray;">
          <i class="box open icon" style="font-size: 2rem; display: block; margin-bottom: 10px;"></i>
          ไม่มีข้อมูลสินค้า
        </div>`;
      }

      filteredProducts.forEach((p) => {
        const masterItem = masterData[p.barcode] || null;
        const productName = masterItem ? masterItem.name : "-";
        const expectedStock = masterItem && masterItem.stock !== undefined ? masterItem.stock : null;

        let statusClass = "status-none";
        let expectedDisplay = "-";

        // Use default text color if not in Master Data or no expected stock
        if (masterItem && expectedStock !== null) {
          expectedDisplay = expectedStock;
          const diff = p.qty - expectedStock;
          if (diff === 0) statusClass = "status-match";
          else if (diff > 0) statusClass = "status-over";
          else statusClass = "status-short";
        }

        const itemDiv = document.createElement("div");
        itemDiv.className = "swipe-row";
        itemDiv.innerHTML = `
            <div class="swipe-content" data-barcode="${p.barcode}">
              <div class="barcode-text">${p.barcode}</div>
              <div class="product-name-text">${productName}</div>
              <div class="expected-text status-none">${expectedDisplay}</div>
              <div class="qty-text ${statusClass}">${p.qty}</div>
            </div>
            <div class="swipe-actions">
              <button class="ui button" onclick="deleteItem('${p.barcode}')">
                <i class="trash icon"></i>
              </button>
            </div>
          `;
        container.appendChild(itemDiv);
      });

      document.getElementById("total").textContent = `Total Products: ${products.length}`;
      initSwipe();
    }

    const input = document.getElementById("barcode-input");
    const searchInput = document.getElementById("search-input");
    let searchTimeout;

    // Smart Focus function
    function focusBarcode() {
      const isScannerOpen = document.getElementById("scanner-overlay").style.display === "flex";
      // Don't steal focus if user is in search box OR if scanner is open
      if (document.activeElement !== searchInput && !isScannerOpen) {
        input.focus();
      }
    }

    function resetSearchTimeout() {
      clearTimeout(searchTimeout);
      const isScannerOpen = document.getElementById("scanner-overlay").style.display === "flex";
      if (document.activeElement === searchInput && !isScannerOpen) {
        searchTimeout = setTimeout(() => {
          // Force focus back to barcode input after 5s of inactivity
          input.focus();

          // Clear search when jumping back to scanning mode 
          // to make it ready for the next scan
          searchInput.value = "";
          searchQuery = "";
          renderList();
        }, 5000);
      }
    }

    function addProduct(barcode) {
      if (barcode) {
        const existing = products.find((p) => p.barcode === barcode);
        const now = Date.now();
        if (existing) {
          existing.qty++;
          existing.timestamp = now;
        } else {
          products.push({
            barcode,
            qty: 1,
            timestamp: now
          });
        }
        lastScannedBarcode = barcode;
        localStorage.setItem("products", JSON.stringify(products));
        renderList();

        input.value = "";
        const isScannerOpen = document.getElementById("scanner-overlay").style.display === "flex";
        if (!isScannerOpen) {
          input.focus(); // Focus after adding
        }
      }
    }

    let deleteTimer;
    // Camera Scanner Logic
    let html5QrCode;
    let currentDetectedBarcode = null;
    const scannerOverlay = document.getElementById("scanner-overlay");
    const openScannerBtn = document.getElementById("open-scanner-btn");
    const closeScannerBtn = document.getElementById("close-scanner-btn");
    const captureScanBtn = document.getElementById("capture-scan-btn");
    const scanInfoBubble = document.getElementById("scan-info-bubble");
    const scannedBarcodeValue = document.getElementById("scanned-barcode-value");
    const scannedCountBubble = document.getElementById("scanned-count-bubble");

    function updateScanBubble(barcode) {
      currentDetectedBarcode = barcode;
      scannedBarcodeValue.textContent = barcode;

      const product = products.find(p => p.barcode === barcode);
      scannedCountBubble.textContent = product ? product.qty : 0;

      scanInfoBubble.style.opacity = "1";
    }

    async function startScanner() {
      input.blur(); // Force keyboard down
      scannerOverlay.style.display = "flex";
      html5QrCode = new Html5Qrcode("reader");

      const config = {
        fps: 25,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minDimension = Math.min(viewfinderWidth, viewfinderHeight);
          // Standard dynamic box: 70% of min dimension
          let qrboxSize = Math.floor(minDimension * 0.7);
          if (qrboxSize < 250) qrboxSize = 250;
          if (qrboxSize > 600) qrboxSize = 600;
          return {
            width: qrboxSize,
            height: qrboxSize
          };
        }
        // Removed aspectRatio: 1.0 to allow video to fill portrait screen naturally
      };

      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            // Success: Update bubble but don't add yet
            updateScanBubble(decodedText);
          },
          (errorMessage) => {
            // parse error, ignore
          }
        );
      } catch (err) {
        console.error("Camera start error:", err);
        alert("ไม่สามารถเข้าถึงกล้องได้: " + err);
        stopScanner();
      }
    }

    async function stopScanner() {
      if (html5QrCode) {
        try {
          await html5QrCode.stop();
          html5QrCode.clear();
        } catch (err) {
          console.error("Camera stop error:", err);
        }
      }
      scannerOverlay.style.display = "none";
      currentDetectedBarcode = null;
      scanInfoBubble.style.opacity = "0";
    }

    openScannerBtn.addEventListener("click", startScanner);
    closeScannerBtn.addEventListener("click", stopScanner);

    captureScanBtn.addEventListener("click", () => {
      if (currentDetectedBarcode) {
        // Vibrate if supported
        if ("vibrate" in navigator) {
          navigator.vibrate(100);
        }

        addProduct(currentDetectedBarcode);

        // Update bubble count immediately
        const product = products.find(p => p.barcode === currentDetectedBarcode);
        scannedCountBubble.textContent = product ? product.qty : 0;

        // Visual feedback
        captureScanBtn.style.background = "#21ba45"; // Success green
        setTimeout(() => {
          captureScanBtn.style.background = "linear-gradient(135deg, #2185d0, #1678c2)";
        }, 200);

        $('body').toast({
          class: 'success',
          message: `บันทึก ${currentDetectedBarcode} สำเร็จ`,
          displayTime: 1000,
          position: 'top center'
        });
      }
    });

    function deleteItem(barcode) {
      // Reset the swiped row position
      const row = document.querySelector(`.swipe-content[data-barcode="${barcode}"]`);
      if (row) row.style.transform = 'translateX(0px)';

      document.getElementById("delete-barcode-display").textContent = barcode;
      const confirmBtn = document.getElementById("delete-modal-confirm");

      $("#delete-modal").modal({
        onVisible: function () {
          let timeLeft = 5;
          confirmBtn.classList.add("disabled");
          confirmBtn.textContent = `ลบรายการ (${timeLeft}s)`;

          if (deleteTimer) clearInterval(deleteTimer);
          deleteTimer = setInterval(() => {
            timeLeft--;
            if (timeLeft > 0) {
              confirmBtn.textContent = `ลบรายการ (${timeLeft}s)`;
            } else {
              clearInterval(deleteTimer);
              confirmBtn.classList.remove("disabled");
              confirmBtn.textContent = "ลบรายการ";
            }
          }, 1000);
        },
        onHide: function () {
          if (deleteTimer) clearInterval(deleteTimer);
        },
        onApprove: function () {
          if (confirmBtn.classList.contains("disabled")) return false;

          products = products.filter(p => p.barcode !== barcode);
          if (lastScannedBarcode === barcode) {
            lastScannedBarcode = "";
          }
          localStorage.setItem("products", JSON.stringify(products));
          renderList();
        }
      }).modal("show");
    }

    function initSwipe() {
      const rows = document.querySelectorAll('.swipe-content');
      let startX = 0;
      let currentX = 0;
      let isSwiping = false;

      function closeOtherRows(currentRow) {
        rows.forEach(r => {
          if (r !== currentRow && r.style.transform !== 'translateX(0px)' && r.style.transform !== '') {
            r.style.transition = 'transform 0.3s ease';
            r.style.transform = 'translateX(0px)';
          }
        });
      }

      rows.forEach(row => {
        row.addEventListener('touchstart', (e) => {
          closeOtherRows(row);
          startX = e.touches[0].clientX;
          isSwiping = true;
          row.style.transition = 'none';
        }, {
          passive: true
        });

        row.addEventListener('touchmove', (e) => {
          if (!isSwiping) return;
          currentX = e.touches[0].clientX;
          let diff = currentX - startX;

          // Ignore small accidental movements (threshold: 10px)
          if (Math.abs(diff) < 10) return;

          // Only allow sliding to the left
          if (diff < 0) {
            // Adjust diff to account for threshold
            let adjustedDiff = diff + 10;
            if (adjustedDiff > 0) adjustedDiff = 0;

            // Cap the slide at 80px
            if (adjustedDiff < -80) adjustedDiff = -80;
            row.style.transform = `translateX(${adjustedDiff}px)`;
          } else {
            row.style.transform = `translateX(0px)`;
          }
        }, {
          passive: true
        });

        row.addEventListener('touchend', (e) => {
          if (!isSwiping) return;
          isSwiping = false;
          row.style.transition = 'transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)';

          let diff = currentX - startX;
          // Threshold check in touchend too
          if (diff < -50) { // Increased threshold slightly for snapping
            // Snap to open
            row.style.transform = `translateX(-80px)`;
          } else {
            // Snap back
            row.style.transform = `translateX(0px)`;
          }
          // Reset currentX to prevent logic errors on next touch
          currentX = startX;
        });
      });
    }

    input.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        const productExists = lastScannedBarcode && products.some(p => p.barcode === lastScannedBarcode);
        if (productExists) {
          $("#qty-modal").modal({
            onVisible: function () {
              const modalInput = document.getElementById("qty-modal-input");
              modalInput.value = "";
              modalInput.focus();
            },
            onApprove: function () {
              const modalInput = document.getElementById("qty-modal-input");
              const extraQty = parseInt(modalInput.value);
              if (!isNaN(extraQty) && extraQty > 1) {
                const product = products.find(p => p.barcode === lastScannedBarcode);
                if (product) {
                  product.qty += (extraQty - 1);
                  localStorage.setItem("products", JSON.stringify(products));
                  renderList();
                }
              } else if (extraQty === 1) {
                // Do nothing as it's already added 1
              }

              // Only reset lastScannedBarcode if user added a valid positive quantity
              if (extraQty > 0) {
                lastScannedBarcode = "";
              }

              input.focus();
            },
            onHide: function () {
              input.focus();
            }
          }).modal("show");
        } else {
          $('body').toast({
            class: 'warning',
            message: 'กรุณาแสกนบาร์โค้ดหรือเลือกสินค้าก่อนกด Spacebar',
            displayTime: 3000,
            position: 'top center'
          });
        }
      }
    });

    document.getElementById("qty-modal-input").addEventListener("keyup", (e) => {
      if (e.key === "Enter") {
        document.getElementById("qty-modal-confirm").click();
      }
    });

    input.addEventListener("keyup", (e) => {
      if (e.key === "Enter") {
        addProduct(input.value.trim());
      }
    });

    document.getElementById("scan-enter-btn").addEventListener("click", () => {
      addProduct(input.value.trim());
    });

    // Auto-focus barcode when clicking anywhere on the page, 
    // but not when clicking search, modals, dropdowns or interactable elements
    document.addEventListener("click", (e) => {
      const isSearch = e.target === searchInput || searchInput.contains(e.target);
      const isInteractable = ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName);
      const isDropdown = e.target.closest('.ui.dropdown');
      const isModal = e.target.closest('.ui.modal');
      const isSpecificAction = e.target.closest('.swipe-actions');

      if (!isSearch && !isInteractable && !isDropdown && !isModal && !isSpecificAction) {
        focusBarcode();
      }
    });

    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      renderList();
      resetSearchTimeout(); // Reset when typing
    });

    searchInput.addEventListener("focus", resetSearchTimeout); // Start timeout on focus
    searchInput.addEventListener("keyup", resetSearchTimeout); // Reset on keyup
    searchInput.addEventListener("blur", () => clearTimeout(searchTimeout)); // Clear if blurred manually

    const importBtn = document.getElementById("import-btn");
    importBtn.addEventListener("click", () => {
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = ".csv";
      fileInput.onchange = (e) => {
        $("#loading-dimmer").dimmer("show");
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
          const csv = e.target.result;
          const lines = csv.split("\n");
          const now = Date.now();
          lines.forEach((line) => {
            const [barcode, qty] = line.split(",");
            if (barcode && barcode.trim() !== "" && barcode.trim() !== "Barcode" && qty) {
              const b = barcode.trim();
              const q = parseInt(qty.trim()) || 0;
              const existing = products.find((p) => p.barcode === b);
              if (existing) {
                existing.qty += q;
                existing.timestamp = now;
              } else {
                products.push({
                  barcode: b,
                  qty: q,
                  timestamp: now
                });
              }
            }
          });
          localStorage.setItem("products", JSON.stringify(products));
          renderList();
          $("#loading-dimmer").dimmer("hide");
        };
        reader.readAsText(file);
      };
      fileInput.click();
    });

    const exportCsvBtn = document.getElementById("export-csv-btn");
    exportCsvBtn.addEventListener("click", () => {
      let csv = "Barcode,Qty,Timestamp\n";
      products.forEach((p) => {
        csv += `${p.barcode},${p.qty},${p.timestamp || ""}\n`;
      });
      const blob = new Blob([csv], {
        type: "text/csv"
      });
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      const a = document.createElement("a");
      a.href = url;
      a.download = `products_stock_${timestamp}.csv`;
      a.click();
    });

    const exportPdfBtn = document.getElementById("export-pdf-btn");
    exportPdfBtn.addEventListener("click", async () => {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      // Create a temporary div for the PDF content
      const pdfContent = document.createElement('div');
      pdfContent.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 210mm;
        padding: 20px;
        background: white;
        font-family: 'Sarabun', 'Arial', sans-serif;
        font-size: 12px;
        line-height: 1.4;
        color: #000000;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-rendering: optimizeLegibility;
      `;

      // Generate paginated HTML content

      // Calculate rows per page (approximately 25 rows per page)
      const rowsPerPage = 25;
      const totalPages = Math.ceil(products.length / rowsPerPage);

      // Create separate pages for proper PDF pagination
      for (let page = 0; page < totalPages; page++) {
        const startIndex = page * rowsPerPage;
        const endIndex = Math.min(startIndex + rowsPerPage, products.length);
        const pageProducts = products.slice(startIndex, endIndex);
        
        const pageTableRows = pageProducts.map(p => {
          const masterItem = masterData[p.barcode] || null;
          const productName = masterItem ? masterItem.name : "-";
          const expected = masterItem && masterItem.stock !== undefined ? masterItem.stock : "-";
          
          return `
            <tr>
              <td style="border: 1px solid #333; padding: 8px; color: #000; font-weight: 500;">${p.barcode}</td>
              <td style="border: 1px solid #333; padding: 8px; color: #000; font-weight: 500;">${productName}</td>
              <td style="border: 1px solid #333; padding: 8px; text-align: right; color: #000; font-weight: 500;">${expected}</td>
              <td style="border: 1px solid #333; padding: 8px; text-align: right; color: #000; font-weight: 500;">${p.qty}</td>
            </tr>
          `;
        }).join('');

        const pageHeader = page === 0 ? `
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #2185d0; margin: 0;">ASM - STOCK CHECKER</h1>
            <p style="color: #666; margin: 5px 0;">Inventory Counting Report</p>
            <p style="color: #666; margin: 5px 0;">Date: ${new Date().toLocaleString('th-TH')}</p>
            <p style="color: #666; margin: 5px 0;">Checked By: ${currentUser || 'Not specified'}</p>
          </div>
        ` : `
          <div style="text-align: center; margin-bottom: 20px;">
            <h3 style="color: #2185d0; margin: 0;">ASM - STOCK CHECKER (ต่อ)</h3>
          </div>
        `;

        let pageContent = pageHeader + `
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; background: white;">
            <thead>
              <tr style="background: #f8f9fa; border-bottom: 2px solid #333;">
                <th style="border: 1px solid #333; padding: 10px 8px; text-align: left; color: #000; font-weight: 700; font-size: 13px;">Barcode</th>
                <th style="border: 1px solid #333; padding: 10px 8px; text-align: left; color: #000; font-weight: 700; font-size: 13px;">Product Name</th>
                <th style="border: 1px solid #333; padding: 10px 8px; text-align: right; color: #000; font-weight: 700; font-size: 13px;">Exp.</th>
                <th style="border: 1px solid #333; padding: 10px 8px; text-align: right; color: #000; font-weight: 700; font-size: 13px;">Count</th>
              </tr>
            </thead>
            <tbody>
              ${pageTableRows}
            </tbody>
          </table>
        `;

        // Add footer with continuation text for all pages except first
        if (page < totalPages - 1) {
          pageContent += `
            <div style="position: absolute; bottom: 30px; left: 0; right: 0; text-align: center;">
              <p style="color: #666; margin: 0; font-size: 10px;">มีต่อหน้า ${page + 2}</p>
            </div>
          `;
        }

        // Add signature only on last page - fixed to bottom with enhanced clarity
        if (page === totalPages - 1) {
          pageContent += `
            <div style="position: absolute; bottom: 50px; left: 0; right: 0; background: white; padding: 30px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                <div style="width: 45%; text-align: center; padding: 10px; border: 1px solid #ccc; border-radius: 5px; background: #f9f9f9;">
                  <div style="font-weight: bold; color: #333; margin-bottom: 10px; font-size: 12px;">ลงชื่อผู้นับคลังสินค้า</div>
                  <div style="border-bottom: 2px solid #000; margin: 5px 0 15px 0; height: 30px;"></div>
                  <div style="font-weight: bold; color: #000; font-size: 14px; margin-top: 5px;">${currentUser || 'Not specified'}</div>
                  <div style="color: #666; font-size: 11px; margin-top: 3px;">Checked By</div>
                </div>
                <div style="width: 45%; text-align: center; padding: 10px; border: 1px solid #ccc; border-radius: 5px; background: #f9f9f9;">
                  <div style="font-weight: bold; color: #333; margin-bottom: 10px; font-size: 12px;">ลงชื่อผู้ตรวจทาน</div>
                  <div style="border-bottom: 2px solid #000; margin: 5px 0 15px 0; height: 30px;"></div>
                  <div style="font-weight: bold; color: #000; font-size: 14px; margin-top: 5px;">&nbsp;</div>
                  <div style="font-weight: bold; color: #000; font-size: 14px; margin-top: 5px;">( ____________________ )</div>
                  <div style="color: #666; font-size: 11px; margin-top: 3px;">Approved By</div>
                </div>
              </div>
            </div>
          `;
        }

        // Create page-specific content with proper positioning
        const pageDiv = document.createElement('div');
        pageDiv.style.cssText = `
          position: absolute;
          left: -9999px;
          top: 0;
          width: 210mm;
          height: 297mm;
          padding: 20px;
          background: white;
          font-family: 'Sarabun', 'Arial', sans-serif;
          font-size: 12px;
          line-height: 1.4;
          color: #000000;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
          position: relative;
        `;
        pageDiv.innerHTML = pageContent;
        document.body.appendChild(pageDiv);

        try {
          // Capture each page as separate image
          const canvas = await html2canvas(pageDiv, {
            scale: 3,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            allowTaint: true,
            removeContainer: false,
            imageTimeout: 15000,
            onclone: (clonedDoc) => {
              const textElements = clonedDoc.querySelectorAll('td, th, p, div, h1, h3');
              textElements.forEach(el => {
                el.style.color = '#000000';
                el.style.textShadow = 'none';
                el.style.webkitTextStroke = '0.5px transparent';
              });
            }
          });

          const imgData = canvas.toDataURL('image/png');
          
          // Add to PDF
          if (page > 0) {
            doc.addPage();
          }
          
          const imgWidth = 210;
          const pageHeight = 295;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          doc.addImage(imgData, 'PNG', 0, 10, imgWidth, Math.min(imgHeight, pageHeight - 20));
          
        } catch (error) {
          console.error(`Error generating page ${page + 1}:`, error);
        } finally {
          document.body.removeChild(pageDiv);
        }
      }

      // Save the PDF
      doc.save(`Stock_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    });

    const clearBtn = document.getElementById("clear-btn");
    clearBtn.addEventListener("click", () => {
      if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลทั้งหมด?")) {
        products = [];
        lastScannedBarcode = "";
        localStorage.setItem("products", JSON.stringify(products));
        renderList();
      }
    });
    const masterDataBtn = document.getElementById("master-data-btn");
    const importMasterBtn = document.getElementById("import-master-btn");
    const clearMasterBtn = document.getElementById("clear-master-btn");
    const masterStatusText = document.getElementById("master-status-text");

    let masterInfo = JSON.parse(localStorage.getItem("masterInfo")) || { filename: "" };

    function updateMasterStatus() {
      const count = Object.keys(masterData).length;
      if (count > 0) {
        masterStatusText.innerHTML = `
          <div class="ui green message">
            <i class="check circle icon"></i>
            พร้อมใช้งาน: <b>${count.toLocaleString()} รายการ</b>
          </div>
          <div style="font-size: 0.85rem; opacity: 0.7; margin-top: 5px;">
            <i class="file alternate icon"></i> ไฟล์: <b>${masterInfo.filename || "ไม่ระบุชื่อ"}</b><br>
            <i class="history icon"></i> อัปเดตล่าสุด: ${new Date().toLocaleDateString('th-TH')}
          </div>
        `;
      } else {
        masterStatusText.innerHTML = `
          <div class="ui tiny orange message">
            <i class="warning circle icon"></i> ยังไม่มีข้อมูลในคลัง
          </div>
          <p style="font-size: 0.9rem; opacity: 0.6;">กรุณานำเข้าไฟล์ CSV เพื่อเริ่มการตรวจสอบยอด</p>
        `;
      }
    }

    masterDataBtn.addEventListener("click", () => {
      updateMasterStatus();
      $("#master-modal").modal("show");
    });

    let currentCsvLines = [];
    let currentCsvHeaders = [];

    let currentFileName = "";

    importMasterBtn.addEventListener("click", () => {
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = ".csv";
      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        currentFileName = file.name;
        const reader = new FileReader();
        reader.onload = (e) => {
          const csv = e.target.result;
          const allLines = csv.split(/\r?\n/).map(l => l.trim()).filter(l => l);
          if (allLines.length < 1) return;

          // Detect delimiter: comma or semicolon by checking first line
          const head = allLines[0];
          const commaCount = (head.match(/,/g) || []).length;
          const semiCount = (head.match(/;/g) || []).length;
          const delimiter = semiCount > commaCount ? ";" : ",";

          // Robust CSV Split helper that handles quotes and escaped quotes
          function splitCsv(str, delim) {
            const parts = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < str.length; i++) {
              let char = str[i];
              let nextChar = str[i + 1];
              if (char === '"') {
                if (inQuotes && nextChar === '"') { current += '"'; i++; }
                else inQuotes = !inQuotes;
              } else if (char === delim && !inQuotes) {
                parts.push(current);
                current = '';
              } else current += char;
            }
            parts.push(current);
            return parts;
          }

          currentCsvHeaders = splitCsv(allLines[0], delimiter);
          currentCsvLines = allLines.slice(1).map(l => ({ line: l, delim: delimiter }));

          // Populate select dropdowns
          const selects = ["map-barcode", "map-name", "map-stock"];
          selects.forEach(id => {
            const select = document.getElementById(id);
            // Reset but keep first option for map-stock
            const firstOption = id === "map-stock" ? select.options[0].outerHTML : "";
            select.innerHTML = firstOption;

            currentCsvHeaders.forEach((header, index) => {
              const opt = document.createElement("option");
              opt.value = index;
              opt.textContent = `${header.trim().replace(/^"|"$/g, '')} (Column ${index + 1})`;

              // Smart defaults based on keywords
              const h = header.toLowerCase();
              if (id === "map-barcode" && (h.includes("barcode") || h.includes("code") || h.includes("sku") || h.includes("id"))) opt.selected = true;
              if (id === "map-name" && (h.includes("name") || h.includes("title") || h.includes("สินค้า") || h.includes("item"))) opt.selected = true;
              if (id === "map-stock" && (h.includes("stock") || h.includes("qty") || h.includes("quantity") || h.includes("คงเหลือ"))) opt.selected = true;

              select.appendChild(opt);
            });
            $(select).dropdown(); // Re-init Fomantic dropdown
          });

          $("#mapping-modal").modal("show");
        };
        reader.readAsText(file);
      };
      fileInput.click();
    });

    document.getElementById("confirm-mapping-btn").addEventListener("click", () => {
      const bIdx = parseInt(document.getElementById("map-barcode").value);
      const nIdx = parseInt(document.getElementById("map-name").value);
      const sVal = document.getElementById("map-stock").value;
      const sIdx = sVal !== "" ? parseInt(sVal) : -1;

      $("#loading-dimmer").dimmer("show");
      let newMaster = {};

      currentCsvLines.forEach((item) => {
        const line = item.line;
        const delim = item.delim;

        // Use the same robust split logic
        const parts = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          let char = line[i];
          let nextChar = line[i + 1];
          if (char === '"') {
            if (inQuotes && nextChar === '"') { current += '"'; i++; }
            else inQuotes = !inQuotes;
          } else if (char === delim && !inQuotes) {
            parts.push(current);
            current = '';
          } else current += char;
        }
        parts.push(current);

        const clean = (val) => {
          if (!val) return "";
          let v = val.trim();
          if (v.startsWith("'")) v = v.substring(1); // Remove Excel prefix
          return v.replace(/^"|"$/g, '').trim();
        };

        const barcode = clean(parts[bIdx]);
        const name = clean(parts[nIdx]);

        let stock = undefined;
        if (sIdx !== -1 && parts[sIdx]) {
          const stockRaw = clean(parts[sIdx]).replace(/[฿,]/g, '');
          stock = parseFloat(stockRaw);
        }

        if (barcode && barcode !== "-") {
          newMaster[barcode] = { name, stock };
        }
      });

      masterData = newMaster;
      masterInfo = { filename: currentFileName };
      localStorage.setItem("masterData", JSON.stringify(masterData));
      localStorage.setItem("masterInfo", JSON.stringify(masterInfo));
      updateMasterStatus();
      renderList();
      $("#loading-dimmer").dimmer("hide");
      $("#mapping-modal").modal("hide");
      $("#master-modal").modal("hide");

      $('body').toast({
        class: 'success',
        message: `นำเข้าข้อมูลสินค้า ${Object.keys(newMaster).length} รายการสำเร็จ`,
        position: 'top center'
      });
    });

    clearMasterBtn.addEventListener("click", () => {
      if (confirm("คุณแน่ใจหรือไม่ว่าต้องการล้างฐานข้อมูลสินค้าทั้งหมด? (รายการที่นับไว้จะไม่หาย)")) {
        masterData = {};
        masterInfo = { filename: "" };
        localStorage.removeItem("masterData");
        localStorage.removeItem("masterInfo");
        updateMasterStatus();
        renderList();
      }
    });

    // Master Data Viewer Logic
    const viewMasterBtn = document.getElementById("view-master-btn");
    const viewerModal = $("#viewer-modal");
    const viewerTbody = document.getElementById("viewer-tbody");
    const viewerSearch = document.getElementById("viewer-search");

    function renderViewer(query = "") {
      viewerTbody.innerHTML = "";
      const barcodes = Object.keys(masterData);
      const filtered = barcodes.filter(bc => {
        const item = masterData[bc];
        return bc.includes(query) || (item.name && item.name.toLowerCase().includes(query.toLowerCase()));
      });

      if (filtered.length === 0) {
        viewerTbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: gray;">ไม่พบข้อมูล</td></tr>';
        return;
      }

      // Display first 200 items for performance
      filtered.slice(0, 200).forEach(bc => {
        const item = masterData[bc];
        const row = document.createElement("tr");
        row.innerHTML = `
          <td style="font-family: monospace;">${bc}</td>
          <td>${item.name || "-"}</td>
          <td style="text-align: right;">${item.stock !== undefined ? item.stock : "-"}</td>
        `;
        viewerTbody.appendChild(row);
      });

      if (filtered.length > 200) {
        const moreRow = document.createElement("tr");
        moreRow.innerHTML = `<td colspan="3" style="text-align: center; opacity: 0.6; font-size: 0.8rem;">... และอีก ${filtered.length - 200} รายการ (ค้นหาเพื่อดูเจาะจง) ...</td>`;
        viewerTbody.appendChild(moreRow);
      }
    }

    viewMasterBtn.addEventListener("click", () => {
      if (Object.keys(masterData).length === 0) {
        alert("ยังไม่มีข้อมูล Master Data ในระบบ");
        return;
      }
      renderViewer();
      viewerModal.modal("show");
    });

    viewerSearch.addEventListener("input", (e) => {
      renderViewer(e.target.value);
    });

    // Initialize user identification
    checkAndAskForUserName();
    
    renderList();
 