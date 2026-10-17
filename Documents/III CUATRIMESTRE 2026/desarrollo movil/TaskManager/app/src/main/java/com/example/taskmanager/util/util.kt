package com.example.taskmanager.util
import android.content.Context
import android.content.Intent


class util {

    companion object{
        fun OpenAcrtivity(context: Context, classActivity: Class<*>){
            val objIntent = Intent(context, classActivity)
              context.startActivity(objIntent)
            }



        }// end fun OpenAcrtivity



}// en class