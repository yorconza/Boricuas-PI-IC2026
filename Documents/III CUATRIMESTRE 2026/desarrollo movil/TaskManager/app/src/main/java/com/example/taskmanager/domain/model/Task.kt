package com.example.taskmanager.domain.model

import android.R
import androidx.appcompat.widget.DialogTitle
import java.time.LocalDate



// es una clase que resive datos
data class Task(
    val id: String,
    val title: String,
    val description: String,
    val dueDate: LocalDate, // cuando se debe ejecutar la tarea
    val creationDate: LocalDate,
    val status: TaskStatus,
    val assignedTO: String,
    val priority: TaskPriority,
    val notes: String

)
