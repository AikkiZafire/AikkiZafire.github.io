// Load data from datasets/videogames_wide.csv using d3.csv and then make visualizations
async function fetchData() {
  const data = await d3.csv("../dataset/videogames_wide.csv");
  return data;
}

fetchData().then(async (data) => {
    // =========================== Describing the Data ===========================
    function drawDescribe(data) {
    if (!data || !data.length) return;

    const cols = Object.keys(data[0]);
    const isNumCol = (col) => {
        let ok = 0, seen = 0;
        for (const d of data) {
            const v = d[col];
            if (v !== undefined && v !== null && String(v).trim() !== "") {
                seen++;
                if (Number.isFinite(+v)) ok++;
            }
        }
        return seen > 0 && ok / seen >= 0.5;
    };
    const types = cols.map(c => {
        const t = isNumCol(c) ? (c.toLowerCase()==="year" ? "ordinal" : "numeric") : "categorical";
        return { col: c, type: t };
    });

    //Mean, Median, Min, Max, Range, Standard Deviation
    const numCols = types.filter(t => t.type !== "categorical").map(t => t.col);
    const toNums = (col) => data.map(d => Number.isFinite(+d[col]) ? +d[col] : null).filter(v => v!==null);
    const mean = arr => arr.reduce((s,v)=>s+v,0)/arr.length;
    const median = arr => {
        const a=[...arr].sort((a,b)=>a-b); const m=Math.floor(a.length/2);
        return a.length%2 ? a[m] : (a[m-1]+a[m])/2;
    };
    const stdev = arr => {
        const m = mean(arr); return Math.sqrt(mean(arr.map(x => (x - m) ** 2)));
    };

    const format = (col, n) => {
    if (n === null || n === undefined) return "—";
    // No decimals for Year
    if (col.toLowerCase() === "year") return Math.round(+n).toString();
    // Two decimals for everything else
    return (+n).toFixed(2);
    };

    const rows = numCols.map(c => {
        const vals = toNums(c); if (!vals.length) return null;
        const mn = Math.min(...vals), mx = Math.max(...vals);
        return {
        col: c,
        mean: format(c, mean(vals)),
        median: format(c, median(vals)),
        min: format(c, mn),
        max: format(c, mx),
        range: format(c, mx - mn),
        stdev: format(c, stdev(vals))
        };
    }).filter(Boolean);

    // --- quick insights (needs these fields if present)
    const has = k => data[0].hasOwnProperty(k);
    const globalSalesRow = rows.find(r => r.col.toLowerCase() === "global_sales");
    const avgGlobal = globalSalesRow ? globalSalesRow.mean : null;

    // totals by category helper
    const sumBy = (key) => {
        const m = new Map();
        for (const d of data) {
        const k = (d[key] || "Unknown");
        const val = has("Global_Sales") ? (+d.Global_Sales || 0) : 0;
        m.set(k, (m.get(k) || 0) + val);
        }
        return [...m.entries()].sort((a,b)=>b[1]-a[1]);
    };
    const topGenre = has("Genre") && has("Global_Sales") ? (sumBy("Genre")[0]?.[0] || null) : null;
    const topPlatform = has("Platform") && has("Global_Sales") ? (sumBy("Platform")[0]?.[0] || null) : null;
    const topPublisher = has("Publisher") && has("Global_Sales") ? (sumBy("Publisher")[0]?.[0] || null) : null;

    // --- render types
    const typeDiv = document.getElementById("type-summary");
    if (typeDiv) {
        typeDiv.innerHTML = `
        <h3>Variables & Data Types</h3>
        <ul>
            ${types.map(t => `<li><strong>${t.col}</strong>: ${t.type}</li>`).join("")}
        </ul>
        `;
    }

    // --- render stats table + insights
    const statsDiv = document.getElementById("stats");
    if (statsDiv) {
        statsDiv.innerHTML = `
        <h3>Summary Statistics</h3>
        <div class="viz-wrap" style="overflow:auto;">
            <table style="width:100%; border-collapse:collapse;">
            <thead>
                <tr>
                <th style="text-align:left; padding:.35rem;">Column</th>
                <th style="text-align:right; padding:.35rem;">Mean</th>
                <th style="text-align:right; padding:.35rem;">Median</th>
                <th style="text-align:right; padding:.35rem;">Min</th>
                <th style="text-align:right; padding:.35rem;">Max</th>
                <th style="text-align:right; padding:.35rem;">Range</th>
                <th style="text-align:right; padding:.35rem;">Std Dev</th>
                </tr>
            </thead>
            <tbody>
                ${rows.map(r => `
                <tr>
                    <td style="padding:.35rem;">${r.col}</td>
                    <td style="text-align:right; padding:.35rem;">${r.mean}</td>
                    <td style="text-align:right; padding:.35rem;">${r.median}</td>
                    <td style="text-align:right; padding:.35rem;">${r.min}</td>
                    <td style="text-align:right; padding:.35rem;">${r.max}</td>
                    <td style="text-align:right; padding:.35rem;">${r.range}</td>
                    <td style="text-align:right; padding:.35rem;">${r.stdev}</td>
                </tr>
                `).join("")}
            </tbody>
            </table>
        </div>
        <p class="vis-caption">
            <br>
            <strong>• Observation:</strong> The range and standard deviation for global sales are both very large, showing that the dataset is highly uneven. 
            While most games sell less than one million copies worldwide, a few blockbuster titles such as Wii Sports or Grand Theft Auto V may push the upper limit dramatically higher. 
            Creating a wide range between the smallest and largest values and a high standard deviation, making the data heavily skewed by a small number of best-selling games. 
            In other words, the average global sales do not represent a “typical” game very well. The median is a better indicator of general performance across titles.
        </p>
        <p>
            <strong>Insights from the summary:</strong><br>
            ${avgGlobal ? `1.) The average global sales per record ≈ <strong>${avgGlobal}</strong>.<br>` : ""}
            ${topGenre ? `2.) Top genre by total global sales is <strong>${topGenre}</strong>.<br>` : ""}
            ${topPlatform ? `3.) Top platform is <strong>${topPlatform}</strong>.<br>` : ""}
            ${topPublisher ? `4.) Top publisher: <strong>${topPublisher}</strong>.<br>` : ""}
        </p>
        `;
        }
    }

    fetchData().then((data) => {
    drawDescribe(data);
    drawV1(data);
    drawV2(data, "Platform");
    drawV3(data, false);
    drawV4(data);
    });


    // =========================== Visualization 1: Global Sales by Genre and Platform ===========================

    // 1) Sum of global sales per platform and genre
    const sums = new Map();
    for (const d of data) {
        const Platform = d.Platform || "Unknown";
        const Genre = d.Genre || "Unknown";
        const val = +d.Global_Sales || 0;     
        const k = `${Platform}||${Genre}`;
        sums.set(k, (sums.get(k) || 0) + val);
    }

    const rows = Array.from(sums, ([k, v]) => {
        const [Platform, Genre] = k.split("||");
        const GlobalSum = +(v.toFixed(2));         
        const Global_Sales_Sum = GlobalSum.toFixed(2); 
        return { Platform, Genre, GlobalSum, Global_Sales_Sum };
    });

    const v1 = vl
        .markBar()
        .data(rows)
        .encode(
        vl.x().fieldN("Platform")
              .title("Platform"),

        vl.y().fieldQ("GlobalSum")
              .title("Global Sales")
              .axis({ format: ".2f" }),

        vl.color().fieldN("Genre")
                  .title("Genre"),

        vl.tooltip(["Platform", "Genre", "Global_Sales_Sum"])
        )
        .width("container")
        .height(400)
        .toSpec();

    render("#view1", v1);

    // =========================== Visualization 2: Sales Over Time by Platform ===========================
    function drawV2(data, groupBy) {
    const field = groupBy === "Genre" ? "Genre" : "Platform";

    // Pre-sum Global_Sales by Year × field
    const sums = new Map();
    const domainSet = new Set();    //creating a new set to store set colors for categories
    for (const d of data) {
        const y = +d.Year;
        if (!Number.isFinite(y)) continue;
        const categ = d[field] || "Unknown";
        domainSet.add(categ);
        const k = `${y}||${categ}`;
        sums.set(k, (sums.get(k) || 0) + (+d.Global_Sales || 0));
    }
    const series = Array.from(sums, ([k, v]) => {
        const [Year, Categ] = k.split("||");
        return { Year: +Year, [field]: Categ, Total: +(v.toFixed(2)) };
    });
    //Locking the color scale for its series
    const colorDomain = Array.from(domainSet);

    // Base spec
    let chart = vl
        .markLine({ point: true })
        .data(series)
        .encode(
        vl.x().fieldO("Year")
              .title("Year"),

        vl.y().fieldQ("Total")
              .title("Global Sales (sum)")
              .axis({ format: ".2f" }),

        vl.color().fieldN(field).title(field)
                  .scale({ domain: colorDomain }) 
                  .legend({
                    orient: "bottom",
                    columns: 16, 
                    symbolLimit: 200
                  }),

        vl.tooltip(["Year", field, "Total"])
        )
        .width("container")
        .height(400)
        .toSpec();

    //Filter Selection: click a legend item to filter and show only that series, and click again to reset to showing all series.
    chart.params = [{
        name: "pick",
        select: {type: "point",     //allows to selecting a data point
                 fields: [field],   
                 bind: "legend", 
                 toggle: false,     //on/off switch, clicking on one data point series hides the others
                 empty: "all"       //clicking on non-data-points (blank) will show all series again
                }
    }];

    // Checks if the chart has any displayed data, and also filtered selections keep their initial series color.
    chart.transform = (chart.transform || []).concat([{ filter: { param: "pick" } }]);

    render("#view2", chart);
    }

    drawV2(data, "Platform");
    document.getElementById("groupBy").addEventListener("change", e =>
    drawV2(data, e.target.value)
    );


    // =========================== Visualization 3: Regional Sales vs Platform ===========================
    function drawV3(data, asPercent) {
    const regions = ["NA_Sales", "EU_Sales", "JP_Sales", "Other_Sales"];

    // Fold and pre-sum to get totals per Platform and Region
    const sums = new Map();
    for (const d of data) {
        for (const r of regions) {
        const k = `${d.Platform}||${r}`;
        sums.set(k, (sums.get(k) || 0) + (+d[r] || 0));
        }
    }
    const summed = Array.from(sums, ([k, v]) => {
        const [Platform, r] = k.split("||");
        return {
            Platform, 
            Region: r.replace("_Sales", ""), 
            SalesSum: parseFloat(v.toFixed(2))
        };
    });

    // Calculate platform totals and percentage shared per platform
    const platformTotals = new Map();
    for(const r of summed){
        platformTotals.set(r.Platform, (platformTotals.get(r.Platform) || 0) + r.SalesSum);
    }
    const withPercent = summed.map(r => {
        const total = platformTotals.get(r.Platform) || 1;
        const percentage = r.SalesSum / total;
        return {
            ...r, 
            Percent: percentage, 
            PercentLabel: (percentage*100).toFixed(1) + "%"
        };
    });

    // Tooltip: Show region total if checkbox is OFF, show region sales covered percentage if ON
    const tooltipFields = asPercent
        ? ["Platform", "Region", "SalesSum", "PercentLabel"]
        : ["Platform", "Region", "SalesSum"]

    const chart = vl
        .markBar()
        .data(withPercent)
        .encode(
        vl.y().fieldN("Platform")
              .sort("-x")
              .title("Platform"),

        vl.x().fieldQ("SalesSum")
              .title(asPercent ? "Regional Share (%)" : "Sales (sum)")
              .stack(asPercent ? "normalize" : true),

        vl.color().fieldN("Region")
                  .title("Region"),

        vl.tooltip(tooltipFields)
        )
        .width("container")
        .height(400)
        .toSpec();

    render("#view3", chart);
    }

    // initial + toggle
    drawV3(data, false);
    document.getElementById("asPercent").addEventListener("change", e =>
    drawV3(data, e.target.checked)
    );

    // =========================== Visualization 4: Visual Story (East vs West) ===========================
    function drawV4(data, topN) {
    //Sum of sales in JP and NA by Genre
    const sums = new Map();
    let totalNA = 0, totalJP = 0;
    for (const d of data) {
        const g = d.Genre || "Unknown";
        const na = +d.NA_Sales || 0;
        const jp = +d.JP_Sales || 0;
        totalNA += na; totalJP += jp;
        const cur = sums.get(g) || { Genre: g, NA: 0, JP: 0 };
        cur.NA += na; cur.JP += jp;
        sums.set(g, cur);
    }

    const genres = Array.from(sums.values());

    //Calculating the shares in a region base on the sales of a genre
    const rows = genres.map(r => {
        const naShare = totalNA ? r.NA / totalNA : 0;
        const jpShare = totalJP ? r.JP / totalJP : 0;
        return {
        Genre: r.Genre,
        NA_SalesSum: +r.NA.toFixed(2),
        JP_SalesSum: +r.JP.toFixed(2),
        NA_Share: +naShare.toFixed(4),
        JP_Share: +jpShare.toFixed(4),
        Diff: +(naShare - jpShare).toFixed(4) // + = NA-leaning, - = JP-leaning
        };
    })
    .sort((a, b) => Math.abs(b.Diff) - Math.abs(a.Diff))
    .slice(0, topN);

    //Flatten to two rows per genre for mirrored bars
    const flat = rows.flatMap(r => ([
        {   Genre: r.Genre, Region: "NA", 
            ShareSigned:  r.NA_Share, 
            Shares: (r.NA_Share*100).toFixed(1)+"%", 
            SalesSum: r.NA_SalesSum, 
            Diff: r.Diff
        },
        {   Genre: r.Genre, 
            Region: "JP", 
            ShareSigned: -r.JP_Share,
            Shares: (r.JP_Share*100).toFixed(1)+"%", 
            SalesSum: r.JP_SalesSum, 
            Diff: r.Diff}
    ]));

    //Getting the max magnitude for symmetric x-scale
    const maxMag = Math.max(...flat.map(d => Math.abs(d.ShareSigned))) || 0.1;

    //Creating the mirrored bar chart
    const spec = vl
        .layer(
        // zero line
        vl.markRule({ strokeWidth: 1 }).data([{x:0}]).encode(
            vl.x().value(0)
        ),
        // bars
        vl.markBar().data(flat).encode(
            vl.y().fieldN("Genre")
                  .sort(rows.map(r => r.Genre))
                  .title(null),

            vl.x().fieldQ("ShareSigned")
                  .title("Region Share")
                  .scale({domain: [-maxMag, maxMag]})
                  .axis({labelExpr: "format(abs(datum.value), '.0%')"}),
                  
            vl.color().fieldN("Region")
                      .scale({ domain: ["JP","NA"] })
                      .title(null),
                      
            vl.tooltip(["Genre","Region","SalesSum","Shares"])
        )
        )
        .width("container")
        .height(500)
        .toSpec();

        render("#view4", spec);
    }

    drawV4(data, 100);  
});

async function render(viewID, spec) {
    const result = await vegaEmbed(viewID, spec);
    result.view.run();
}