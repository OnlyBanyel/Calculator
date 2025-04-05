$(document).ready(function() {
    const $display = $('#inputBar');
    let currentInput = '';
    let previousInput = '';
    let operation = null;
    let resetInput = false;

    // Select all calculator buttons and add click handlers
    $('.calc-btn').on('click', function() {
        const buttonValue = $(this).text().trim();
        handleButtonPress(buttonValue);
    });

    function handleButtonPress(value) {
        switch(value) {
            case '0':
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
                appendNumber(value);
                break;
            case '.':
                appendDecimal();
                break;
            case '+':
            case '-':
            case 'x':
            case '÷':
                setOperation(value);
                break;
            case '=':
                calculate();
                break;
            case 'DEL':
                deleteLastChar();
                break;
            case 'CI/C':
                clearInput();
                break;
            case 'ON/CA':
                clearAll();
                break;
            case '+/-':
                toggleSign();
                break;
            case '%':
                percentage();
                break;
            case '√':
                squareRoot();
                break;
            // Add more cases for other functions as needed
            default:
                console.log('Unhandled button:', value);
        }
    }

    function appendNumber(number) {
        if (resetInput) {
            currentInput = '';
            resetInput = false;
        }
        if (currentInput === '0') {
            currentInput = number;
        } else {
            currentInput += number;
        }
        updateDisplay();
    }

    function appendDecimal() {
        if (resetInput) {
            currentInput = '0.';
            resetInput = false;
            updateDisplay();
            return;
        }
        if (!currentInput.includes('.')) {
            currentInput += '.';
            updateDisplay();
        }
    }

    function setOperation(op) {
        if (currentInput === '') return;
        if (previousInput !== '') {
            calculate();
        }
        operation = op;
        previousInput = currentInput;
        currentInput = '';
    }

    function calculate() {
        let result;
        const prev = parseFloat(previousInput);
        const current = parseFloat(currentInput);
        
        if (isNaN(prev) || isNaN(current)) return;
        
        switch (operation) {
            case '+':
                result = prev + current;
                break;
            case '-':
                result = prev - current;
                break;
            case 'x':
                result = prev * current;
                break;
            case '÷':
                result = prev / current;
                break;
            default:
                return;
        }
        
        currentInput = result.toString();
        operation = null;
        previousInput = '';
        resetInput = true;
        updateDisplay();
    }

    function clearInput() {
        currentInput = '0';
        updateDisplay();
    }

    function clearAll() {
        currentInput = '0';
        previousInput = '';
        operation = null;
        updateDisplay();
    }

    function deleteLastChar() {
        if (currentInput.length <= 1) {
            currentInput = '0';
        } else {
            currentInput = currentInput.slice(0, -1);
        }
        updateDisplay();
    }

    function toggleSign() {
        currentInput = (parseFloat(currentInput) * -1).toString();
        updateDisplay();
    }

    function percentage() {
        currentInput = (parseFloat(currentInput) / 100).toString();
        updateDisplay();
    }

    function squareRoot() {
        currentInput = Math.sqrt(parseFloat(currentInput)).toString();
        updateDisplay();
    }

    function updateDisplay() {
        $display.val(currentInput === '' ? '0' : currentInput);
    }
});