package com.example.taskmanager

import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import android.widget.Button
import android.widget.EditText
import android.widget.ImageButton
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import com.example.taskmanager.R
import java.util.Calendar

class TaskActivity : AppCompatActivity() {

    private lateinit var txtId: EditText
    private lateinit var txtTitle: EditText
    private lateinit var txtDescription: EditText
    private lateinit var txtStatus: EditText
    private lateinit var txtPriority: EditText
    private lateinit var txtAssignTo: EditText
    private lateinit var txtObservation: EditText
    private lateinit var tvDueDate: EditText // <-- CORREGIDO A EditText (igual que en el XML)

    private var dueDay: Int = 0
    private var dueMonth: Int = 0
    private var dueYear: Int = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_task)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        // Mapeo de vistas
        txtId = findViewById(R.id.txtId_Task)
        txtTitle = findViewById(R.id.txtTitle_Task)
        txtDescription = findViewById(R.id.txtDescription_Task)
        txtStatus = findViewById(R.id.txtStatus_Task)
        txtPriority = findViewById(R.id.txtPriority_Task)
        txtAssignTo = findViewById(R.id.txtAssignTo_Task)
        txtObservation = findViewById(R.id.txtObservation_Task)
        tvDueDate = findViewById(R.id.tvDueDate_task) // <-- Ahora coincide perfectamente como EditText

        // Botones de la interfaz
        val btnSearch: ImageButton = findViewById(R.id.imageButton)
        val btnDueDate: ImageButton = findViewById(R.id.BtnDueDate_task)
        val btnSave: Button = findViewById(R.id.btnSave_Task)
        val btnRemove: Button = findViewById(R.id.btnRemove_Task)
        val btnCancel: Button = findViewById(R.id.btnCancel_Task)

        // Eventos Click para los botones dentro del onCreate()
        btnSearch.setOnClickListener {
            onSearchClicked()
        } // end btnSearch.setOnClickListener

        btnDueDate.setOnClickListener {
            onSelectDueDateClicked()
        }

        btnSave.setOnClickListener {
            onSaveClicked()
        }

        btnRemove.setOnClickListener {
            onRemoveClicked()
        }

        btnCancel.setOnClickListener {
            onCancelClicked()
        }
    }

    // ==========================================
    // FUNCIONES DE LÓGICA
    // ==========================================

    private fun onSearchClicked() {
        val idString = txtId.text.toString().trim()
        if (idString.isEmpty()) {
            Toast.makeText(this, getString(R.string.msg_no_data_found), Toast.LENGTH_SHORT).show()
            return
        }
        Toast.makeText(this, "Buscando tarea ID: $idString", Toast.LENGTH_SHORT).show()
    }

    private fun onSelectDueDateClicked() {
        val calendar = Calendar.getInstance()
        val year = calendar.get(Calendar.YEAR)
        val month = calendar.get(Calendar.MONTH)
        val day = calendar.get(Calendar.DAY_OF_MONTH)

        val datePickerDialog = android.app.DatePickerDialog(
            this,
            { _, selectedYear, selectedMonth, selectedDay ->
                dueYear = selectedYear
                dueMonth = selectedMonth + 1
                dueDay = selectedDay
                val formattedDate = String.format("%02d/%02d/%d", dueDay, dueMonth, dueYear)
                tvDueDate.setText(formattedDate) // Uso de setText para EditText
            },
            year, month, day
        )
        datePickerDialog.show()
    }

    private fun onSaveClicked() {
        val title = txtTitle.text.toString().trim()
        val description = txtDescription.text.toString().trim()

        if (title.isEmpty() || description.isEmpty()) {
            Toast.makeText(this, getString(R.string.msg_error_save), Toast.LENGTH_SHORT).show()
            return
        }

        val builder = AlertDialog.Builder(this)
        builder.setTitle("Confirmación")
        builder.setMessage(getString(R.string.dialog_confirm_message))

        builder.setPositiveButton(getString(R.string.dialog_btn_yes)) { _, _ ->
            Toast.makeText(this, getString(R.string.msg_success_save), Toast.LENGTH_SHORT).show()
            clearForm()
        }

        builder.setNegativeButton(getString(R.string.dialog_btn_no)) { dialog, _ ->
            dialog.dismiss()
        }
        builder.show()
    }

    private fun onRemoveClicked() {
        val status = txtStatus.text.toString().trim().uppercase()

        // Validación: La tarea no puede ser eliminada o anulada porque está completa
        if (status == "COMPLETED") {
            Toast.makeText(this, getString(R.string.msg_cannot_delete_completed), Toast.LENGTH_LONG).show()
            return
        }

        val builder = AlertDialog.Builder(this)
        builder.setTitle("Confirmar eliminación")
        builder.setMessage(getString(R.string.dialog_confirm_message))

        builder.setPositiveButton(getString(R.string.dialog_btn_yes)) { _, _ ->
            Toast.makeText(this, getString(R.string.msg_success_delete), Toast.LENGTH_SHORT).show()
            clearForm()
        }

        builder.setNegativeButton(getString(R.string.dialog_btn_no)) { dialog, _ ->
            dialog.dismiss()
        }
        builder.show()
    }

    private fun onCancelClicked() {
        clearForm()
        Toast.makeText(this, "Acción cancelada", Toast.LENGTH_SHORT).show()
    }

    private fun clearForm() {
        txtId.text.clear()
        txtTitle.text.clear()
        txtDescription.text.clear()
        txtStatus.text.clear()
        txtPriority.text.clear()
        txtAssignTo.text.clear()
        txtObservation.text.clear()
        tvDueDate.text.clear() // Uso de text.clear() para EditText
        dueDay = 0
        dueMonth = 0
        dueYear = 0
    }
}