package com.example.taskmanager.data.memory

import com.example.taskmanager.domain.model.Task
import com.example.taskmanager.domain.repository.ITaskRepository


// esta clase va implementar repositorio
class TaskMemoryManager : ITaskRepository {
    private val tasks = mutableListOf<Task>() // se crea una lista mutable la cual permite agregar y elimiar datos constantemente

    // implementar metodo
    override fun addTask(task: Task) {
        tasks.add(task)
    } // end override

    override fun deleteTask(id: String) {
        tasks.removeIf {it.id.trim() == id.trim()}
    }// end delete

    override fun updateTask(task: Task) {
        deleteTask(task.id)
        addTask(task)

    }// end update

    override fun getTask() = tasks // es lo mismo que hacver un return

    override fun getById(id: String): Task? {
        val result = tasks.filter { it.id.trim() == id.trim()  } // filter revuelve elementos que encontro
        return if (result.any()) result[0] else null // aqui hace que si encontro datos muestre lo que encontro y si no que muestre null

    }





}// en clase