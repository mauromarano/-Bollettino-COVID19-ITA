# Bollettino-COVID19-ITA

F.A.Q.
------

**Cos'è?**

*È un bot che ogni giorno raccoglie i dati relativi ai nuovi contaggi da SARS-CoV-2 e li pubblica su un canale telegram.*

**Qual è il link al canale telegram?**

*Il link è il seguente : [Covid-19 Bollettino](https://t.me/covid19bollettinoenotizie)*

**Da dove vengono questi dati?**

*Tutti i dati provengono dalla repository ufficiale della [Presidenza del Consiglio dei Ministri - Dipartimento della Protezione Civile](https://github.com/pcm-dpc/COVID-19)*

*I dati relativi ai vaccini vendono dal [repository ufficiale](https://github.com/italia/covid19-opendata-vaccini)*.

**Il canale telegram è gratis? Ci sono pubblicità?**

*Il canale è completamente gratuito. Non ci sono pubblicità e tutto il progetto è a vantaggio della collettività.*

**Il codice non mi piace, potrebbe essere scritto meglio!**

*Si, è probabile. Ho deciso di pubblicare il progetto il prima possibile.  Tutto il codice va revisionato e passato sotto processo di refactoring. Se vuoi dare un contributo non solo sei libero di farlo ma è anche molto gradito!*

Prima di iniziare
-----------------

Rinominare *config.template.js* in *config.js* inserendo tutti i dati per la configurazione.

Grafici
---------

I grafici vengono realizzati tramite [quickchart.io](https://quickchart.io/), basato su [chart.js](https://www.chartjs.org/).


Installazione con Docker
---------

1. `git clone git@github.com:gagginaspinnata/Bollettino-COVID19-ITA.git`
2. `cd Bollettino-COVID19-ITA`
3. `docker build -t bollettinocovid19 .`
4. `docker run -p 5000:5000 bollettinocovid19`
