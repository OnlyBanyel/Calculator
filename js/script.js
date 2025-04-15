$(document).ready(() => {
  // DOM elements
  const $display = $("#display")
  const $memoryIndicator = $("#memory-indicator")
  const $cursorPosition = $("#cursor-position")

  // Calculator state
  let currentInput = "0"
  let cursorIndex = 1
  let memory = 0
  let isCalculated = false
  let taxRate = 5 // Default tax rate of 5%
  let grandTotal = 0
  const history = []
  let historyIndex = -1
  let isViewingHistory = false
  let isSettingTaxRate = false

  // Initialize display
  updateDisplay()

  // Helper functions
  function updateDisplay() {
    $display.val(currentInput)

    // Position cursor indicator
    if (cursorIndex > currentInput.length) {
      cursorIndex = currentInput.length
    }

    // Calculate cursor position based on character position
    const displayWidth = $display.width()
    const textWidth = currentInput.length * 15 // Approximate character width
    const rightPadding = 10

    // Calculate position based on right-aligned text
    const totalWidth = displayWidth - rightPadding
    const charsFromRight = currentInput.length - cursorIndex

    $cursorPosition.css({
      right: rightPadding + charsFromRight * 15 + "px",
      display: "block",
    })
  }

  function insertAtCursor(text) {
    if (isSettingTaxRate) {
      // When setting tax rate, only allow numbers and decimal
      if (!isNaN(text) || text === ".") {
        if (currentInput === "TAX RATE:" || currentInput === "TAX RATE: 0") {
          currentInput = "TAX RATE: " + text
        } else {
          currentInput += text
        }
        cursorIndex = currentInput.length
        updateDisplay()
      }
      return
    }

    if (isCalculated) {
      currentInput = text
      cursorIndex = text.length
      isCalculated = false
    } else {
      if (currentInput === "0" && !isNaN(text) && text !== ".") {
        currentInput = text
        cursorIndex = 1
      } else {
        currentInput = currentInput.slice(0, cursorIndex) + text + currentInput.slice(cursorIndex)
        cursorIndex += text.length
      }
    }
    updateDisplay()
  }

  function clearAll() {
    if (isSettingTaxRate) {
      exitTaxRateMode()
      return
    }

    currentInput = "0"
    cursorIndex = 1
    isCalculated = false
    history.length = 0
    historyIndex = -1
    isViewingHistory = false
    updateDisplay()
  }

  function clearEntry() {
    if (isSettingTaxRate) {
      currentInput = "TAX RATE: 0"
      cursorIndex = currentInput.length
      updateDisplay()
      return
    }

    if (isCalculated) {
      clearAll()
    } else {
      currentInput = "0"
      cursorIndex = 1
      updateDisplay()
    }
  }

  function deleteAtCursor() {
    if (isSettingTaxRate) {
      if (currentInput.length > 10) {
        // "TAX RATE: " is 10 characters
        currentInput = currentInput.slice(0, -1)
        cursorIndex = currentInput.length
        updateDisplay()
      }
      return
    }

    if (cursorIndex > 0) {
      currentInput = currentInput.slice(0, cursorIndex - 1) + currentInput.slice(cursorIndex)
      cursorIndex--
      if (currentInput === "") {
        currentInput = "0"
        cursorIndex = 1
      }
      updateDisplay()
    }
  }

  function calculate() {
    if (isSettingTaxRate) {
      saveTaxRate()
      return
    }

    try {
      // Replace mathematical symbols with JavaScript operators
      const expression = currentInput.replace(/×/g, "*").replace(/÷/g, "/").replace(/\^/g, "**")

      const result = eval(expression)

      if (isNaN(result) || !isFinite(result)) {
        currentInput = "Error"
      } else {
        // Format the result
        currentInput = Number.parseFloat(result.toFixed(10)).toString()
        // Remove trailing zeros
        if (currentInput.includes(".")) {
          currentInput = currentInput.replace(/\.?0+$/, "")
        }
      }

      cursorIndex = currentInput.length
      isCalculated = true

      // Add to history
      history.push(currentInput)
      historyIndex = history.length

      updateDisplay()
    } catch (error) {
      currentInput = "Error"
      cursorIndex = currentInput.length
      updateDisplay()
    }
  }

  // Tax rate modification functions
  function enterTaxRateMode() {
    isSettingTaxRate = true
    currentInput = "TAX RATE: " + taxRate
    cursorIndex = currentInput.length
    updateDisplay()
  }

  function exitTaxRateMode() {
    isSettingTaxRate = false
    currentInput = "0"
    cursorIndex = 1
    updateDisplay()
  }

  function saveTaxRate() {
    try {
      // Extract the number part from "TAX RATE: X.XX"
      const newRate = Number.parseFloat(currentInput.substring(10))
      if (!isNaN(newRate) && newRate >= 0) {
        taxRate = newRate
        // Show confirmation
        currentInput = "RATE SET: " + taxRate + "%"
        updateDisplay()

        // Return to normal mode after showing confirmation
        setTimeout(() => {
          exitTaxRateMode()
        }, 1500)
      } else {
        // Invalid input
        currentInput = "INVALID RATE"
        updateDisplay()
        setTimeout(() => {
          enterTaxRateMode()
        }, 1000)
      }
    } catch (error) {
      currentInput = "ERROR"
      updateDisplay()
      setTimeout(() => {
        exitTaxRateMode()
      }, 1000)
    }
  }

  // Button click handlers
  // Fix: Only select number buttons that are not double-zero
  $(".number:not(#double-zero)").on("click", function () {
    const value = $(this).text()
    insertAtCursor(value)
  })

  // Separate handler for double-zero
  $("#double-zero").on("click", () => {
    insertAtCursor("00")
  })

  $("#decimal").on("click", () => {
    if (isSettingTaxRate) {
      // Only add decimal if there isn't one already in the tax rate
      if (!currentInput.substring(10).includes(".")) {
        insertAtCursor(".")
      }
      return
    }

    // Check if there's already a decimal in the current number segment
    const parts = currentInput.split(/[+\-×÷]/)
    const currentPart = parts[parts.length - 1]

    if (!currentPart.includes(".")) {
      insertAtCursor(".")
    }
  })

  $("#add, #subtract, #multiply, #divide").on("click", function () {
    if (!isSettingTaxRate) {
      const value = $(this).text()
      insertAtCursor(value)
    }
  })

  $("#equals").on("click", () => {
    calculate()
  })

  $("#on-c").on("click", () => {
    clearAll()
  })

  $("#ce").on("click", () => {
    clearEntry()
  })

  $("#del").on("click", () => {
    deleteAtCursor()
  })

  $("#plus-minus").on("click", () => {
    if (isSettingTaxRate) {
      // Toggle negative tax rate if needed
      if (currentInput.substring(10, 11) === "-") {
        currentInput = "TAX RATE: " + currentInput.substring(11)
      } else {
        currentInput = "TAX RATE: -" + currentInput.substring(10)
      }
      cursorIndex = currentInput.length
      updateDisplay()
      return
    }

    if (currentInput !== "0") {
      if (currentInput.startsWith("-")) {
        currentInput = currentInput.substring(1)
        cursorIndex--
      } else {
        currentInput = "-" + currentInput
        cursorIndex++
      }
      updateDisplay()
    }
  })

  $("#percent").on("click", () => {
    if (!isSettingTaxRate) {
      try {
        const value = Number.parseFloat(currentInput) / 100
        currentInput = value.toString()
        cursorIndex = currentInput.length
        updateDisplay()
      } catch (error) {
        currentInput = "Error"
        updateDisplay()
      }
    }
  })

  $("#square-root").on("click", () => {
    if (!isSettingTaxRate) {
      try {
        const value = Math.sqrt(Number.parseFloat(currentInput))
        if (isNaN(value)) {
          currentInput = "Error"
        } else {
          currentInput = value.toString()
        }
        cursorIndex = currentInput.length
        isCalculated = true
        updateDisplay()
      } catch (error) {
        currentInput = "Error"
        updateDisplay()
      }
    }
  })

  // Exponent function
  $("#exponent").on("click", () => {
    if (!isSettingTaxRate) {
      insertAtCursor("^")
    }
  })

  // Fraction function
  $("#fraction").on("click", () => {
    if (isSettingTaxRate) return

    // If the display already shows a fraction, calculate it
    if (currentInput.includes("/")) {
      try {
        const parts = currentInput.split("/")
        if (parts.length === 2) {
          const decimal = Number.parseFloat(parts[0]) / Number.parseFloat(parts[1])
          currentInput = decimal.toString()
          cursorIndex = currentInput.length
          updateDisplay()
        }
      } catch (error) {
        currentInput = "Error"
        cursorIndex = currentInput.length
        updateDisplay()
      }
      return
    }

    // If we're in the middle of entering a number, add a fraction separator
    if (currentInput !== "0" && !isCalculated) {
      insertAtCursor("/")
      return
    }

    // If we have a calculated result, convert to fraction
    if (isCalculated) {
      try {
        const value = Number.parseFloat(currentInput)

        // Convert decimal to fraction
        const decimalToFraction = (decimal) => {
          if (decimal === Number.parseInt(decimal)) {
            return { numerator: decimal, denominator: 1 }
          }

          // Convert to string and count decimal places
          const decimalStr = decimal.toString()
          const decimalPlaces = decimalStr.includes(".") ? decimalStr.split(".")[1].length : 0

          // Convert to fraction with denominator based on decimal places
          let denominator = Math.pow(10, decimalPlaces)
          let numerator = decimal * denominator

          // Find greatest common divisor
          const findGCD = (a, b) => {
            return b ? findGCD(b, a % b) : a
          }

          const gcd = findGCD(numerator, denominator)

          // Simplify the fraction
          numerator = numerator / gcd
          denominator = denominator / gcd

          return {
            numerator: Math.round(numerator),
            denominator: Math.round(denominator),
          }
        }

        const fraction = decimalToFraction(value)
        currentInput = `${fraction.numerator}/${fraction.denominator}`
        cursorIndex = currentInput.length
        updateDisplay()
      } catch (error) {
        currentInput = "Error"
        cursorIndex = currentInput.length
        updateDisplay()
      }
    }
  })

  // Memory functions
  $("#rm-cm").on("click", () => {
    if (isSettingTaxRate) return

    // Double click or long press would clear memory, but for now just toggle
    if (memory !== 0) {
      currentInput = memory.toString()
      cursorIndex = currentInput.length
      updateDisplay()
    } else {
      memory = 0
      $memoryIndicator.css("opacity", "0")
    }
  })

  $("#m-plus").on("click", () => {
    if (isSettingTaxRate) return

    try {
      memory += Number.parseFloat(currentInput)
      $memoryIndicator.css("opacity", "1")
      isCalculated = true
    } catch (error) {
      // Handle error
    }
  })

  $("#m-minus").on("click", () => {
    if (isSettingTaxRate) return

    try {
      memory -= Number.parseFloat(currentInput)
      $memoryIndicator.css("opacity", "1")
      isCalculated = true
    } catch (error) {
      // Handle error
    }
  })

  // Tax functions
  $("#tax").on("click", () => {
    if (isSettingTaxRate) return

    try {
      const value = Number.parseFloat(currentInput)
      const taxAmount = value * (taxRate / 100)
      currentInput = (value - taxAmount).toString()
      cursorIndex = currentInput.length
      isCalculated = true
      updateDisplay()
    } catch (error) {
      currentInput = "Error"
      updateDisplay()
    }
  })

  $("#tax-plus").on("click", () => {
    if (isSettingTaxRate) return

    try {
      const value = Number.parseFloat(currentInput)
      const taxAmount = value * (taxRate / 100)
      currentInput = (value + taxAmount).toString()
      cursorIndex = currentInput.length
      isCalculated = true
      updateDisplay()
    } catch (error) {
      currentInput = "Error"
      updateDisplay()
    }
  })

  // Grand Total function
  $("#gt").on("click", () => {
    if (isSettingTaxRate) return

    try {
      grandTotal += Number.parseFloat(currentInput)
      currentInput = grandTotal.toString()
      cursorIndex = currentInput.length
      isCalculated = true
      updateDisplay()
    } catch (error) {
      currentInput = "Error"
      updateDisplay()
    }
  })

  // Markup function
  $("#mu").on("click", () => {
    if (isSettingTaxRate) return

    try {
      const cost = Number.parseFloat(currentInput)
      // Assuming a standard 30% markup
      const markup = cost * 0.3
      currentInput = (cost + markup).toString()
      cursorIndex = currentInput.length
      isCalculated = true
      updateDisplay()
    } catch (error) {
      currentInput = "Error"
      updateDisplay()
    }
  })

  // Round Value function
  $("#rv").on("click", () => {
    if (isSettingTaxRate) return

    try {
      const value = Number.parseFloat(currentInput)
      currentInput = Math.round(value).toString()
      cursorIndex = currentInput.length
      isCalculated = true
      updateDisplay()
    } catch (error) {
      currentInput = "Error"
      updateDisplay()
    }
  })

  // Left and right parentheses
  $("#left-paren, #right-paren").on("click", function () {
    if (!isSettingTaxRate) {
      insertAtCursor($(this).text())
    }
  })

  // Arrow key navigation
  $("#left-arrow").on("click", () => {
    if (isSettingTaxRate) return

    if (cursorIndex > 0) {
      cursorIndex--
      updateDisplay()
    }
  })

  $("#right-arrow").on("click", () => {
    if (isSettingTaxRate) return

    if (cursorIndex < currentInput.length) {
      cursorIndex++
      updateDisplay()
    }
  })

  $("#up-arrow").on("click", () => {
    if (isSettingTaxRate) return
    if (history.length === 0) return

    if (historyIndex > 0) {
      historyIndex--
    } else {
      historyIndex = 0
    }

    currentInput = history[historyIndex]
    cursorIndex = currentInput.length
    isViewingHistory = true
    updateDisplay()
  })

  $("#down-arrow").on("click", () => {
    if (isSettingTaxRate) return
    if (history.length === 0) return

    if (historyIndex < history.length - 1) {
      historyIndex++
      currentInput = history[historyIndex]
    } else {
      // If at the end of history, return to current input
      currentInput = "0"
      isViewingHistory = false
    }

    cursorIndex = currentInput.length
    updateDisplay()
  })

  // Tax Rate Modification - Button Combination
  // Hold TAX- and press % to enter tax rate modification mode
  let taxButtonPressed = false
  let taxButtonTimer = null

  $("#tax").on("mousedown touchstart", () => {
    taxButtonPressed = true
    taxButtonTimer = setTimeout(() => {
      if (taxButtonPressed) {
        enterTaxRateMode()
        taxButtonPressed = false
      }
    }, 1000) // Long press for 1 second
  })

  $("#tax").on("mouseup mouseleave touchend", () => {
    if (taxButtonTimer) {
      clearTimeout(taxButtonTimer)
    }
    taxButtonPressed = false
  })

  // Show cursor position
  $display.on("focus", () => {
    $cursorPosition.show()
  })

  // Initial focus
  setTimeout(() => {
    $cursorPosition.show()
  }, 1000)
})
