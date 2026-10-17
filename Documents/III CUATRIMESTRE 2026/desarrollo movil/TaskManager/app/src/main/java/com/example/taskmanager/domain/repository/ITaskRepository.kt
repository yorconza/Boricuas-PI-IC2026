package com.example.taskmanager.domain.repository

import com.example.taskmanager.domain.model.Task



// aqui se va definir todos los metedos que se van a usar en la intefaz
interface ITaskRepository {
    fun getTask(): List<Task>
    fun getById(id: String): Task?// el ? esque puede devolver un objeto tipo task o null
    fun addTask(task: Task)
    fun updateTask(task: Task)
    fun deleteTask(id: String)


}