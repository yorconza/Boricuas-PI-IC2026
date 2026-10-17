package com.example.taskmanager.viewmodel

import com.example.taskmanager.domain.model.Task
import com.example.taskmanager.domain.repository.ITaskRepository
import androidx.lifecycle.ViewModel




// este va resivir por parametro
class TaskViewModel(
    private val repository: ITaskRepository
):ViewModel(){

    fun getTask() : List<Task>{
        return repository.getTask()
    }


    fun getById(id: String): Task?{
        return repository.getById(id)
    }

    fun saveTask(task: Task){
        repository.addTask(task)
    }


    fun updateTask(task: Task){
        repository.updateTask(task)
    }

    fun removeTask(id: String){
        repository.deleteTask(id)
    }





    }





