package com.example.taskmanager

import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import android.widget.Button
import android.widget.Toast
import android.view.View
import androidx.constraintlayout.widget.ConstraintLayout
import com.google.android.material.snackbar.Snackbar
import android.content.Intent
import com.example.taskmanager.util.util
import kotlin.jvm.java

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_main)
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        //vaya busque y haga una instancia

        val btnMessage1 : Button = findViewById<Button>(R.id.btnMessage1_main)
        btnMessage1.setOnClickListener(View.OnClickListener { view ->
            Toast.makeText(this, R.string.Textmessage1, Toast.LENGTH_SHORT).show()

        })// end btnMessage1.setOnClickListener.lo anterior es la creacion del evento




        // config para el mensaje 2
        val clmain = findViewById<ConstraintLayout>(R.id.main)
        class snackbarClick: View.OnClickListener{
            override fun onClick(p0: View?) {
                Snackbar.make(clmain,"Mensaje de cancelacion",Snackbar.LENGTH_SHORT).show()

            }// end override
        }// end class


        val btnMessage2 : Button = findViewById<Button>(R.id.btnMessage2_main)
        btnMessage2.setOnClickListener(View.OnClickListener { view ->
            val mySnackbar = Snackbar.make(clmain,R.string.TextMessage2,
                Snackbar.LENGTH_LONG)
            mySnackbar.setAction(R.string.TextSnackbar, snackbarClick())
            mySnackbar.show()

        })//en message2


        // creacion del mensaje del boton 3
        val btnOpenScrean : Button = findViewById<Button>(R.id.btnOpenScrean)
        btnOpenScrean.setOnClickListener(View.OnClickListener { view ->
            util.OpenAcrtivity(this, SecondActivity::class.java)



        })


        // CREACION DEL BOTON DE LA TAREA
        // enlazar el boton de la interfaz con una variable
        val btnTask = findViewById<Button>(R.id.btnTask_main)

        // enlazar el segundo boton, el de listar
        val btnTaskList = findViewById<Button>(R.id.btnTaskList_main)


        //programar la accion que debe de ocurrir al hacer click
        btnTask.setOnClickListener{
           // se crea el Intent para ir desde esta actividad (this) hacia taskActivity
            val intent = Intent(this, TaskActivity::class.java)
            // iniciar la nueva actividad
            startActivity(intent)
        }// end btnTask.setOnClickListener boton 1



        //accion del botn de listar
        btnTaskList.setOnClickListener{

            // crear el intent
            val intent = Intent(this,TaskListActivity::class.java)
            // inicar la nueva actividad
            startActivity(intent)

        }// end btnTaskList.setOnClickListener boton 2



    }// end oncreate
}