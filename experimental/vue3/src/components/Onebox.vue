<template>
    <div>
    <table width="100%">
        <tr>
            <td width="20%">
                Start typing product name
            </td>
            <td>
                <v-autocomplete
                label="Autocomplete"
                :items="product_list"
                v-model="selected_product"
                @update:model-value="showProduct"
                >
                </v-autocomplete>                   
            </td>
        </tr>
        <!-- <tr>
            Selected product: {{ selected_product }}
        </tr> -->
    </table>     
    </div>
</template>

<script>
import router from '../router';

export default {
    data() {
        return {
            product_list:  [],

            selected_product: null,
        }
    },
    methods: {
        showProduct() {
            router.push({
                name: 'product',
                params: { product_name: this.selected_product } 
            })
        }
    },
    mounted() {
        this.axios.get(import.meta.env.VITE_VUE3_SERVER + "/product/")
        .then(response => {
            if (response.status == 200) {
                // products = response.data.products
                for (var p of response.data.products) {
                    this.product_list.push(p.title)
                }
            }
        })
    }
}
</script>