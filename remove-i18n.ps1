# Script to remove i18n references from all TypeScript files
# This script will replace common i18n.t() calls with Spanish strings

$replacements = @{
    "i18n.t\('common.home'\)" = "'Inicio'"
    "i18n.t\('common.products'\)" = "'Productos'"
    "i18n.t\('common.sales'\)" = "'Ventas'"
    "i18n.t\('common.cash'\)" = "'Caja'"
    "i18n.t\('common.categories'\)" = "'Categorías'"
    "i18n.t\('common.stats'\)" = "'Estadísticas'"
    "i18n.t\('common.error'\)" = "'Error'"
    "i18n.t\('common.confirm'\)" = "'Confirmar'"
    "i18n.t\('common.cancel'\)" = "'Cancelar'"
    "i18n.t\('common.delete'\)" = "'Eliminar'"
    "i18n.t\('common.selectColor'\)" = "'Seleccionar Color'"
    "i18n.t\('tags.title'\)" = "'Etiquetas'"
    "i18n.t\('quotes.title'\)" = "'Presupuestos'"
    "i18n.t\('quotes.status.pending'\)" = "'Pendiente'"
    "i18n.t\('quotes.status.approved'\)" = "'Aprobado'"
    "i18n.t\('quotes.status.rejected'\)" = "'Rechazado'"
    "i18n.t\('quotes.status.converted'\)" = "'Convertido'"
    "i18n.t\('quotes.items'\)" = "'Items'"
    "i18n.t\('quotes.total'\)" = "'Total'"
    "i18n.t\('products.newEditProduct'\)" = "'Producto'"
    "i18n.t\('products.detail.title'\)" = "'Detalle Producto'"
    "i18n.t\('sales.new'\)" = "'Nueva Venta'"
    "i18n.t\('sales.detail.title'\)" = "'Detalle Venta'"
    "i18n.t\('sales.detail.loading'\)" = "'Cargando...'"
    "i18n.t\('sales.detail.notFound'\)" = "'Venta no encontrada'"
    "i18n.t\('sales.detail.back'\)" = "'Volver'"
    "i18n.t\('sales.detail.products'\)" = "'Productos'"
    "i18n.t\('sales.detail.summary'\)" = "'Resumen'"
    "i18n.t\('sales.detail.totalProducts'\)" = "'Total productos'"
    "i18n.t\('sales.detail.totalItems'\)" = "'Total items'"
    "i18n.t\('sales.detail.paymentMethod'\)" = "'Método de pago'"
    "i18n.t\('sales.detail.total'\)" = "'Total'"
    "i18n.t\('sales.detail.notes'\)" = "'Notas'"
    "i18n.t\('sales.detail.errorLoading'\)" = "'Error al cargar la venta'"
    "i18n.t\('sales.detail.unknownDate'\)" = "'Fecha desconocida'"
    "i18n.t\('sales.detail.invalidDate'\)" = "'Fecha inválida'"
    "i18n.t\('sales.emptyCart'\)" = "'Carrito vacío'"
    "i18n.t\('sales.notes'\)" = "'Notas'"
    "i18n.t\('sales.addNotes'\)" = "'Agregar notas...'"
    "i18n.t\('sales.successSale'\)" = "'Venta realizada con éxito'"
    "i18n.t\('sales.errorSale'\)" = "'Error al cargar ventas'"
    "i18n.t\('sales.errorSelectProduct'\)" = "'Seleccione un producto'"
    "i18n.t\('sales.errorValidQuantity'\)" = "'Ingrese una cantidad válida'"
    "i18n.t\('payment.cash'\)" = "'Efectivo'"
    "i18n.t\('payment.transfer'\)" = "'Transferencia'"
    "i18n.t\('payment.debit'\)" = "'Débito'"
    "i18n.t\('payment.credit'\)" = "'Crédito'"
    "i18n.t\('receipt.generate'\)" = "'Generar recibo'"
    "i18n.t\('receipt.generateQuestion'\)" = "'¿Desea generar un recibo?'"
    "i18n.t\('receipt.skip'\)" = "'Omitir'"
    "i18n.t\('receipt.generateError'\)" = "'Error al generar recibo'"
    "i18n.t\('receipt.title'\)" = "'Recibo de Venta'"
    "i18n.t\('receipt.date'\)" = "'Fecha'"
    "i18n.t\('receipt.product'\)" = "'Producto'"
    "i18n.t\('receipt.quantity'\)" = "'Cantidad'"
    "i18n.t\('receipt.unitPrice'\)" = "'Precio Unit.'"
    "i18n.t\('receipt.subtotal'\)" = "'Subtotal'"
    "i18n.t\('receipt.totalProducts'\)" = "'Total productos'"
    "i18n.t\('receipt.totalItems'\)" = "'Total items'"
    "i18n.t\('receipt.paymentMethod'\)" = "'Método de pago'"
    "i18n.t\('receipt.total'\)" = "'Total'"
    "i18n.t\('receipt.notes'\)" = "'Notas'"
    "i18n.t\('receipt.thankYou'\)" = "'¡Gracias por su compra!'"
    "i18n.t\('settings.language'\)" = "'Idioma'"
}

# Get all TypeScript files in app directory
$files = Get-ChildItem -Path "app" -Recurse -Include *.tsx,*.ts

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $modified = $false
    
    # Remove import lines
    if ($content -match "import i18n from") {
        $content = $content -replace "import i18n from [^;]+;[\r\n]+", ""
        $modified = $true
    }
    
    # Replace all i18n.t() calls
    foreach ($pattern in $replacements.Keys) {
        if ($content -match $pattern) {
            $content = $content -replace $pattern, $replacements[$pattern]
            $modified = $true
        }
    }
    
    # Save if modified
    if ($modified) {
        $content | Set-Content $file.FullName -Encoding UTF8 -NoNewline
        Write-Host "Updated: $($file.FullName)"
    }
}

Write-Host "Done! Removed i18n references from all files."
