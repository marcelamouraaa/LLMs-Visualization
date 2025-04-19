import React, { Component } from "react";
import "./App.css";
import FileUpload from "./FileUpload";
import * as d3 from 'd3';

class Streamgraph extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: [],
      selected_data: [],
    };
  }

  colorScale = d3.scaleOrdinal()
    .domain(["GPT-4", "Gemini", "PaLM-2", "Claude", "LLaMA-3.1"])
    .range(["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00"]);

  componentDidMount() {
    this.renderChart();
  }

  componentDidUpdate() {
    this.renderChart();
  }

  set_data = (csv_data) => {
    this.setState({ data: csv_data });
  };

  renderChart = () => {
    const margin = { top: 20, right: 20, bottom: 50, left: 50 },
      width = 500 - margin.left - margin.right,
      height = 550 - margin.top - margin.bottom;

    var data = this.state.data;
    data = data.map(d => ({ ...d, Date: new Date(d.Date) }));

    const stackGenerator = d3.stack()
      .keys(["GPT-4", "Gemini", "PaLM-2", "Claude", "LLaMA-3.1"])
      .offset(d3.stackOffsetWiggle);

    const stackSeries = stackGenerator(data);

    const maxY = d3.max(stackSeries, series =>
      d3.max(series, d => d[1])
    );

    const xScale = d3.scaleTime()
      .domain(d3.extent(data, d => d.Date))
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([d3.min(stackSeries[0], d => d[0]), maxY])
      .range([height, 0]);

    const areaGen = d3.area()
      .x(d => xScale(d.data.Date))
      .y0(d => yScale(d[0]))
      .y1(d => yScale(d[1]))
      .curve(d3.curveCardinal);

    const svg = d3.select(".container")
      .attr("width", width + margin.left + margin.right + 300)
      .attr("height", height + margin.top + margin.bottom);

    const chart = svg.selectAll(".chart")
      .data([null])
      .join("g")
      .attr("class", "chart")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    chart.selectAll('.areas')
      .data(stackSeries)
      .join('path')
      .attr('class', 'areas')
      .attr("d", d => areaGen(d))
      .attr('fill', d => this.colorScale(d.key))
      .on("mouseover", (event, d) => {
        d3.select("#tooltip").style("display", "block");
        this.showBarChart(d.key);
      })
      .on("mousemove", (event) => {
        d3.select("#tooltip")
          .style("left", (event.pageX + 20) + "px")
          .style("top", (event.pageY - 20) + "px");
      })
      .on("mouseleave", () => {
        d3.select("#tooltip").style("display", "none");
        d3.select("#tooltip").select("svg").remove();
      });

    chart.selectAll(".x-axis")
      .data([null])
      .join("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0, ${height + 10})`)
      .call(d3.axisBottom(xScale).ticks(d3.timeMonth.every(1)).tickFormat(d3.timeFormat("%b")));

    chart.selectAll(".y-axis")
      .data([null])
      .join("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(yScale).tickSize(0).tickFormat(""));

    chart.select(".y-axis path").attr("stroke", "none");

    //---legend---
    const legend = chart.selectAll(".legend-group")
      .data([null])
      .join("g")
      .attr("class", "legend-group")
      .attr("transform", `translate(${width + 50}, 150)`);

    const legendData = [
      { name: "LLaMA-3.1", color: "#ff7f00" },
      { name: "Claude", color: "#984ea3" },
      { name: "PaLM-2", color: "#4daf4a" },
      { name: "Gemini", color: "#377eb8" },
      { name: "GPT-4", color: "#e41a1c" }
    ];

    const legendItems = legend.selectAll(".legend-item")
      .data(legendData)
      .join("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 25})`);

    legendItems.append("rect")
      .attr("width", 20)
      .attr("height", 20)
      .attr("fill", d => d.color);

    legendItems.append("text")
      .attr("x", 25)
      .attr("y", 12)
      .text(d => d.name)
      .style("font-size", "14px")
      .attr("alignment-baseline", "middle");
  };

  showBarChart = (key) => {
    const tooltip = d3.select("#tooltip");
    tooltip.select("svg").remove();

    const barWidth = 300, barHeight = 150;

    const svg = tooltip.append("svg")
      .attr("width", barWidth)
      .attr("height", barHeight);

    var barData = this.state.data;
    
    barData = barData.map(d => ({
      Date: new Date(d.Date),
      value: +d[key]
    }));

    barData.sort((a, b) => a.Date - b.Date);

    const xScale = d3.scaleTime()
      .domain(d3.extent(barData, d => d.Date))
      .range([30, barWidth - 30]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(barData, d => d.value)])
      .range([barHeight- 30, 10]);

    svg.append("g")
      .selectAll("rect")
      .data(barData)
      .join("rect")
      .attr("x", d => xScale(d.Date))
      .attr("y", d => yScale(d.value))
      .attr("width", 20)
      .attr("height", d => barHeight - 30 - yScale(d.value))
      .attr("fill", this.colorScale(key));

    svg.append("g")
      .attr("transform", `translate(10,${barHeight - 30})`)
      .call(
        d3.axisBottom(xScale)
          .ticks(barData.length)
          .tickFormat(d3.timeFormat("%b"))
          .tickSizeOuter(0)
      );
    svg.append("g")
      .attr("transform", `translate(30, 0)`)
      .call(d3.axisLeft(yScale).ticks(5).tickSizeOuter(0));
  };

  render() {
    return (
      <div>
        <FileUpload set_data={this.set_data}></FileUpload>
        <svg className="container"></svg>
        <div id="tooltip" style={{
          position: 'absolute',
          display: 'none',
          backgroundColor: 'white',
          padding: '10px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
        }}></div>
      </div>
    );
  }
}

export default Streamgraph;