# Carta celeste

`generateSkyChart` consulta o serviço CDS HiPS2FITS e retorna uma URL de dados PNG com uma marca no centro. A ascensão reta, a declinação e o campo de visão são dados em graus. A função usa os recursos de imagem e Canvas do navegador e está disponível em `src/skyChart.js` no repositório.

Na raiz do repositório, execute `python -m http.server 8000` e abra [o exemplo no navegador](http://localhost:8000/examples/sky_chart.html). Use os botões para alterar o campo de visão. O trecho abaixo pode ser usado em um HTML na pasta `examples/`.

```html
<img id="chart" alt="Carta celeste da estrela de referência">
<script type="module">
  import { generateSkyChart } from "../src/skyChart.js";

  document.querySelector("#chart").src = await generateSkyChart(86.42874873, 7.551638, {
    width: 800,
    height: 600,
    fov: 0.5,
    survey: "P/DSS2/color",
  });
</script>
```
